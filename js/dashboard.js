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


// 페이지 로드시 초기화
document.addEventListener('DOMContentLoaded', function() {
    loadDashboardData();

    // 5분마다 자동 새로고침
    setInterval(loadDashboardData, 300000);
});


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
    col.className = 'col-md-6 mb-3';

    // 기본 데이터 설정
    const companyName = company.name || '미상';
    const district = company.district || company.address || '지역 정보 없음';
    const employeeCount = company.employee_count || company.employees || '임직원수 없음';
    const industry = company.industry || company.business_type || 'IT/소프트웨어';

    col.innerHTML = `
        <div class="card company-card">
            <div class="card-body">
                <div class="row">
                    <div class="col-8">
                        <h6 class="card-title text-primary">${companyName}</h6>
                    </div>
                    <div class="col-4 text-end">
                        <small class="text-muted">마지막 업데이트</small><br>
                        <small>${formatDate(company.last_update)}</small>
                    </div>
                </div>
                <hr class="my-2">
                <div class="row mb-2">
                    <div class="col-3">
                        <strong>지역:</strong>
                    </div>
                    <div class="col-9">
                        ${district}
                    </div>
                </div>
                <div class="row mb-2">
                    <div class="col-3">
                        <strong>임직원수:</strong>
                    </div>
                    <div class="col-9">
                        ${employeeCount}명
                    </div>
                </div>
                <div class="row mb-2">
                    <div class="col-3">
                        <strong>업종:</strong>
                    </div>
                    <div class="col-9">
                        ${industry}
                    </div>
                </div>
                <div class="d-flex justify-content-end mt-3">
                    <button class="btn btn-sm btn-outline-primary" onclick="viewDetailsReal('${companyName}')">
                        상세보기
                    </button>
                </div>
            </div>
        </div>
    `;

    return col;
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
    col.className = 'col-md-6 mb-3';

    const companyName = company.name || '미상';
    const district = company.district || company.address || '지역 정보 없음';
    const employeeCount = company.employee_count || company.employees || '임직원수 없음';
    const industry = company.industry || '업종 정보 없음';

    col.innerHTML = `
        <div class="card company-card">
            <div class="card-body">
                <div class="row">
                    <div class="col-8">
                        <h6 class="card-title text-primary">${companyName}</h6>
                    </div>
                    <div class="col-4 text-end">
                        <small class="text-muted">마지막 업데이트</small><br>
                        <small>${formatDate(company.lastUpdate)}</small>
                    </div>
                </div>
                <hr class="my-2">
                <div class="row mb-2">
                    <div class="col-3">
                        <strong>지역:</strong>
                    </div>
                    <div class="col-9">
                        ${district}
                    </div>
                </div>
                <div class="row mb-2">
                    <div class="col-3">
                        <strong>임직원수:</strong>
                    </div>
                    <div class="col-9">
                        ${employeeCount}명
                    </div>
                </div>
                <div class="row mb-2">
                    <div class="col-3">
                        <strong>업종:</strong>
                    </div>
                    <div class="col-9">
                        ${industry}
                    </div>
                </div>
                <div class="d-flex justify-content-end mt-3">
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
            district: '경기도 성남시 분당구',
            employee_count: 3500,
            analyzed: true,
            lastUpdate: new Date()
        },
        {
            id: '2',
            name: '카카오',
            industry: 'IT/소프트웨어',
            district: '경기도 성남시 분당구',
            employee_count: 4200,
            analyzed: true,
            lastUpdate: new Date()
        },
        {
            id: '3',
            name: '삼성바이오로직스',
            industry: '바이오/제약',
            district: '인천광역시 연수구',
            employee_count: 2100,
            analyzed: true,
            lastUpdate: new Date()
        },
        {
            id: '4',
            name: 'LG화학',
            industry: '화학/제조업',
            district: '서울특별시 영등포구',
            employee_count: 1850,
            analyzed: true,
            lastUpdate: new Date()
        },
        {
            id: '5',
            name: '쿠팡',
            industry: '전자상거래/유통',
            district: '서울특별시 송파구',
            employee_count: 5600,
            analyzed: true,
            lastUpdate: new Date()
        },
        {
            id: '6',
            name: '하이브',
            industry: '엔터테인먼트/미디어',
            district: '서울특별시 용산구',
            employee_count: 1200,
            analyzed: false,
            lastUpdate: new Date()
        }
    ];
}