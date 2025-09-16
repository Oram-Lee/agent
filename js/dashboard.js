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
    console.log('🔄 페이지 로드 - 실제 데이터 로드 시작');

    // 실제 데이터 로드
    loadDashboardData();

    // 5분마다 자동 새로고침
    setInterval(loadDashboardData, 300000);
});


// 대시보드 데이터 로드
async function loadDashboardData() {
    try {
        console.log('📊 실제 기업 데이터 로드 중...');
        const response = await fetch('dashboard_data.json');
        if (response.ok) {
            const data = await response.json();
            const companies = data.companies || [];
            console.log('✅ 실제 데이터 로드 성공:', companies.length + '개 기업 분석 완료');
            updateDashboardWithRealData(data, companies);
        } else {
            throw new Error('기업 데이터 파일을 찾을 수 없습니다.');
        }
    } catch (error) {
        console.error('🚨 데이터 로드 실패:', error);
        showError('기업 데이터를 불러오는데 실패했습니다. 새로고침을 시도해주세요.');
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

    // 위험도 순으로 정렬 (높은 위험도부터)
    const sortedCompanies = companies.sort((a, b) => b.risk_score - a.risk_score);

    console.log('📋 기업 리스트 업데이트:', sortedCompanies.length + '개 기업');

    sortedCompanies.forEach(company => {
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
    const district = company.district || '지역 정보 없음';
    const employeeCount = company.employee_count ? company.employee_count.toLocaleString() : '정보 없음';
    const industry = company.industry || '업종 정보 없음';
    const riskLevel = company.risk_score >= 70 ? 'high' : company.risk_score >= 40 ? 'medium' : 'low';
    const riskColor = riskLevel === 'high' ? 'danger' : riskLevel === 'medium' ? 'warning' : 'success';
    const riskText = riskLevel === 'high' ? '고위험' : riskLevel === 'medium' ? '중위험' : '저위험';

    col.innerHTML = `
        <div class="card company-card border-${riskColor} border-2">
            <div class="card-body">
                <div class="row">
                    <div class="col-8">
                        <h6 class="card-title text-primary">${companyName}</h6>
                        <span class="badge bg-${riskColor}">${riskText} (${company.risk_score}%)</span>
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
                        <small>${district}</small>
                    </div>
                </div>
                <div class="row mb-2">
                    <div class="col-3">
                        <strong>임직원수:</strong>
                    </div>
                    <div class="col-9">
                        <strong class="text-info">${employeeCount}명</strong>
                    </div>
                </div>
                <div class="row mb-2">
                    <div class="col-3">
                        <strong>업종:</strong>
                    </div>
                    <div class="col-9">
                        <span class="badge bg-secondary">${industry}</span>
                    </div>
                </div>
                <div class="row mb-2">
                    <div class="col-3">
                        <strong>예측:</strong>
                    </div>
                    <div class="col-9">
                        <small class="text-muted">${company.prediction || '분석 중'}</small>
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

    // 수집 상태 업데이트
    document.getElementById('collectionStatus').textContent = '완료';
    document.getElementById('statusSpinner').style.display = 'none';
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
function updateLastUpdateTime(date) {
    const updateTime = date ? new Date(date) : new Date();
    document.getElementById('lastUpdate').textContent =
        `마지막 업데이트: ${formatDate(updateTime)}`;
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
    console.error('❌ ' + message);

    // 상태 업데이트
    document.getElementById('collectionStatus').textContent = '오류';
    document.getElementById('statusSpinner').style.display = 'none';

    // 리스트 컨테이너에 에러 메시지 표시
    const listContainer = document.getElementById('companyList');
    listContainer.innerHTML = `
        <div class="col-12">
            <div class="alert alert-danger" role="alert">
                <h5>⚠️ 데이터 로드 실패</h5>
                <p>${message}</p>
                <button class="btn btn-outline-danger" onclick="loadDashboardData()">
                    다시 시도
                </button>
            </div>
        </div>
    `;
}

// 상세 정보 보기 (실제 데이터용)
function viewDetailsReal(companyName) {
    // TODO: 실제 상세 정보 모달 구현
    alert(`${companyName} 상세 정보\n\n- 사무실 이전 위험도 분석\n- 수집된 뉴스 및 공시 정보\n- 임대차 계약 정보\n- 사업 확장 계획\n\n(상세 정보 페이지 구현 예정)`);
}