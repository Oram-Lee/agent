// API 키 설정
const API_KEYS = {
    kakao_js: '1ac6eee9b1e4c2e0cc6f1d1ca1a6a559',
    // Firebase 설정은 나중에 추가
};

// Firebase 설정 (실제 설정값으로 교체 필요)
const firebaseConfig = {
    // Firebase 프로젝트 설정이 여기에 들어갑니다
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};

// Firebase 초기화 (실제 사용시 주석 해제)
// firebase.initializeApp(firebaseConfig);
// const db = firebase.firestore();

// 차트 변수들
let progressChart, monthlyChart, industryChart;

// 페이지 로드시 초기화
document.addEventListener('DOMContentLoaded', function() {
    initializeCharts();
    loadDashboardData();
    
    // 5분마다 자동 새로고침
    setInterval(loadDashboardData, 300000);
});

// 차트 초기화
function initializeCharts() {
    // 진행률 도넛 차트
    const progressCtx = document.getElementById('progressChart').getContext('2d');
    progressChart = new Chart(progressCtx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [0, 100],
                backgroundColor: ['#007bff', '#e9ecef'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { display: false }
            }
        }
    });

    // 월별 추이 차트
    const monthlyCtx = document.getElementById('monthlyChart').getContext('2d');
    monthlyChart = new Chart(monthlyCtx, {
        type: 'line',
        data: {
            labels: ['1월', '2월', '3월', '4월', '5월', '6월'],
            datasets: [{
                label: '이전 예측 건수',
                data: [12, 19, 3, 5, 2, 3],
                borderColor: '#007bff',
                backgroundColor: 'rgba(0, 123, 255, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });

    // 업종별 차트
    const industryCtx = document.getElementById('industryChart').getContext('2d');
    industryChart = new Chart(industryCtx, {
        type: 'bar',
        data: {
            labels: ['IT/소프트웨어', '제조업', '금융', '바이오', '유통'],
            datasets: [{
                label: '이전 위험도',
                data: [65, 45, 80, 55, 70],
                backgroundColor: [
                    '#dc3545', '#ffc107', '#28a745', '#17a2b8', '#6f42c1'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    });
}

// 대시보드 데이터 로드
async function loadDashboardData() {
    try {
        // 실제 수집 데이터 로드
        const response = await fetch('dashboard_data.json');
        if (response.ok) {
            const data = await response.json();
            const companies = data.companies || [];
            console.log('✅ 실제 데이터 로드 성공:', companies.length + '개 기업');
            updateDashboardWithRealData(data, companies);
        } else {
            // 백업: 더미 데이터 사용
            console.log('⚠️ 실제 데이터 로드 실패, 더미 데이터 사용');
            const companies = generateDummyData();
            updateStatusCards(companies);
            updateCompanyList(companies);
        }
        
        
    } catch (error) {
        console.error('데이터 로드 실패:', error);
        showError('데이터를 불러오는데 실패했습니다.');
    }
}

// 실제 데이터로 대시보드 업데이트
function updateDashboardWithRealData(data, companies) {
    // 메타데이터에서 통계 정보 추출
    const metadata = data.summary || {};
    
    // 실제 데이터로 상태 카드 업데이트
    updateStatusCardsReal(metadata, companies);
    
    // 실제 데이터로 회사 리스트 업데이트
    updateCompanyListReal(companies);
    
    // 차트 데이터 업데이트
    updateChartsWithRealData(companies);
    
    updateLastUpdateTime(metadata.collection_date);
}

// 실제 데이터로 상태 카드 업데이트
function updateStatusCardsReal(metadata, companies) {
    const total = companies.length;
    const highRisk = companies.filter(c => c.risk_score >= 70).length;
    const collectionProgress = 100; // 수집 완료
    
    document.getElementById('analyzedCompanies').textContent = total;
    document.getElementById('totalCompanies').textContent = total;
    document.getElementById('highRiskCompanies').textContent = highRisk;
    document.getElementById('collectionProgress').textContent = collectionProgress;
    
    // 진행률 차트 업데이트
    progressChart.data.datasets[0].data = [collectionProgress, 100 - collectionProgress];
    progressChart.update();
    
    // 수집 상태 업데이트
    document.getElementById('collectionStatus').textContent = '완료';
    document.getElementById('statusSpinner').style.display = 'none';
}

// 실제 데이터로 회사 리스트 업데이트
function updateCompanyListReal(companies) {
    const listContainer = document.getElementById('companyList');
    listContainer.innerHTML = '';
    
    // 위험도 순으로 정렬 (이미 정렬되어 있음)
    companies.slice(0, 12).forEach(company => {
        const card = createCompanyCardReal(company);
        listContainer.appendChild(card);
    });
}

// 실제 데이터로 회사 카드 생성
function createCompanyCardReal(company) {
    const col = document.createElement('div');
    col.className = 'col-md-4 mb-3';
    
    const riskClass = company.risk_score >= 70 ? 'high-risk' : 
                     company.risk_score >= 40 ? 'medium-risk' : 'low-risk';
    
    // 주요 신호 생성
    const signals = [];
    const counts = company.data_counts || {};
    
    if (counts.naver_news > 0) signals.push(`뉴스 ${counts.naver_news}건`);
    if (counts.google_results > 0) signals.push(`검색 ${counts.google_results}건`);
    if (counts.dart_office > 0) signals.push(`공시 ${counts.dart_office}건`);
    
    col.innerHTML = `
        <div class="card company-card ${riskClass}">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start">
                    <h6 class="card-title">${company.name}</h6>
                    <span class="badge bg-primary">${company.risk_score}%</span>
                </div>
                <p class="card-text small text-muted">IT/소프트웨어</p>
                <div class="mb-2">
                    <small class="text-muted">예측:</small><br>
                    <strong>${company.prediction || '분석 중'}</strong>
                </div>
                <div class="mb-2">
                    <small class="text-muted">수집 데이터:</small><br>
                    <small>${signals.slice(0, 2).join(', ') || '데이터 없음'}</small>
                </div>
                <div class="d-flex justify-content-between">
                    <small class="text-muted">수집: ${formatDate(company.last_update)}</small>
                    <button class="btn btn-sm btn-outline-primary" onclick="viewDetailsReal('${company.name}')">
                        상세보기
                    </button>
                </div>
            </div>
        </div>
    `;
    
    return col;
}

// 실제 데이터로 차트 업데이트
function updateChartsWithRealData(companies) {
    // 월별 추이 차트 (임시 데이터)
    const monthlyData = [12, 19, 3, 5, companies.length, 8];
    monthlyChart.data.datasets[0].data = monthlyData;
    monthlyChart.update();
    
    // 위험도별 분포
    const highRisk = companies.filter(c => c.risk_score >= 70).length;
    const mediumRisk = companies.filter(c => c.risk_score >= 40 && c.risk_score < 70).length;
    const lowRisk = companies.filter(c => c.risk_score < 40).length;
    
    industryChart.data.labels = ['고위험', '중위험', '저위험'];
    industryChart.data.datasets[0].data = [
        (highRisk / companies.length * 100).toFixed(1),
        (mediumRisk / companies.length * 100).toFixed(1),
        (lowRisk / companies.length * 100).toFixed(1)
    ];
    industryChart.data.datasets[0].backgroundColor = ['#dc3545', '#ffc107', '#28a745'];
    industryChart.update();
}

// 상태 카드 업데이트
function updateStatusCards(companies) {
    const total = companies.length;
    const analyzed = companies.filter(c => c.analyzed).length;
    const highRisk = companies.filter(c => c.riskScore >= 80).length;
    const progress = total > 0 ? Math.round((analyzed / total) * 100) : 0;
    
    document.getElementById('analyzedCompanies').textContent = analyzed;
    document.getElementById('totalCompanies').textContent = total;
    document.getElementById('highRiskCompanies').textContent = highRisk;
    document.getElementById('collectionProgress').textContent = progress;
    
    // 진행률 차트 업데이트
    progressChart.data.datasets[0].data = [progress, 100 - progress];
    progressChart.update();
}

// 회사 리스트 업데이트
function updateCompanyList(companies) {
    const listContainer = document.getElementById('companyList');
    listContainer.innerHTML = '';
    
    // 위험도 순으로 정렬
    companies.sort((a, b) => b.riskScore - a.riskScore);
    
    companies.slice(0, 12).forEach(company => {
        const card = createCompanyCard(company);
        listContainer.appendChild(card);
    });
}

// 회사 카드 생성
function createCompanyCard(company) {
    const col = document.createElement('div');
    col.className = 'col-md-4 mb-3';
    
    const riskClass = company.riskScore >= 80 ? 'high-risk' : 
                     company.riskScore >= 50 ? 'medium-risk' : 'low-risk';
    
    col.innerHTML = `
        <div class="card company-card ${riskClass}">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start">
                    <h6 class="card-title">${company.name}</h6>
                    <span class="badge bg-primary">${company.riskScore}%</span>
                </div>
                <p class="card-text small text-muted">${company.industry}</p>
                <div class="mb-2">
                    <small class="text-muted">예상 이전시기:</small><br>
                    <strong>${company.predictedDate || '미정'}</strong>
                </div>
                <div class="mb-2">
                    <small class="text-muted">주요 신호:</small><br>
                    <small>${company.signals?.slice(0, 2).join(', ') || '없음'}</small>
                </div>
                <div class="d-flex justify-content-between">
                    <small class="text-muted">마지막 업데이트: ${formatDate(company.lastUpdate)}</small>
                    <button class="btn btn-sm btn-outline-primary" onclick="viewDetails('${company.id}')">
                        상세보기
                    </button>
                </div>
            </div>
        </div>
    `;
    
    return col;
}

// 마지막 업데이트 시간 업데이트
function updateLastUpdateTime() {
    const now = new Date();
    document.getElementById('lastUpdate').textContent = 
        `마지막 업데이트: ${formatDate(now)}`;
}

// 날짜 포맷팅
function formatDate(date) {
    if (!date) return '-';
    const d = new Date(date);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
}

// 데이터 새로고침
function refreshData() {
    document.getElementById('collectionStatus').textContent = '수집 중...';
    document.getElementById('statusSpinner').style.display = 'inline-block';
    
    setTimeout(() => {
        loadDashboardData();
        document.getElementById('collectionStatus').textContent = '완료';
        document.getElementById('statusSpinner').style.display = 'none';
    }, 2000);
}

// 상세 정보 보기
function viewDetails(companyId) {
    // 상세 모달 또는 새 페이지로 이동
    alert(`${companyId} 상세 정보 (구현 예정)`);
}

// 에러 표시
function showError(message) {
    console.error(message);
    // 실제 에러 알림 구현
}

// 더미 데이터 생성 (테스트용)
function generateDummyData() {
    return [
        {
            id: '1',
            name: '네이버',
            industry: 'IT/소프트웨어',
            riskScore: 85,
            predictedDate: '2024년 3분기',
            signals: ['신규 투자 유치', '대규모 채용'],
            analyzed: true,
            lastUpdate: new Date()
        },
        {
            id: '2',
            name: '카카오',
            industry: 'IT/소프트웨어',
            riskScore: 72,
            predictedDate: '2024년 하반기',
            signals: ['임대차 계약 만료 임박', '사업 확장'],
            analyzed: true,
            lastUpdate: new Date()
        },
        {
            id: '3',
            name: '삼성바이오로직스',
            industry: '바이오',
            riskScore: 91,
            predictedDate: '2024년 2분기',
            signals: ['대규모 시설 투자', '신규 사업장 설립'],
            analyzed: true,
            lastUpdate: new Date()
        },
        {
            id: '4',
            name: 'LG화학',
            industry: '제조업',
            riskScore: 45,
            predictedDate: '2025년 상반기',
            signals: ['배터리 사업 확장'],
            analyzed: true,
            lastUpdate: new Date()
        },
        {
            id: '5',
            name: '쿠팡',
            industry: '유통',
            riskScore: 78,
            predictedDate: '2024년 4분기',
            signals: ['물류센터 확장', '인력 증원'],
            analyzed: true,
            lastUpdate: new Date()
        },
        {
            id: '6',
            name: '하이브',
            industry: '엔터테인먼트',
            riskScore: 67,
            predictedDate: '미정',
            signals: ['글로벌 진출', '신규 스튜디오'],
            analyzed: false,
            lastUpdate: new Date()
        }
    ];
}