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


// 전역 변수
let allCompanies = []; // 전체 기업 데이터
let filteredCompanies = []; // 필터링된 기업 데이터

// 페이지 로드시 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 페이지 로드 - 실제 데이터 로드 시작');

    // 지역 선택 이벤트 리스너 추가
    initializeLocationSelectors();

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

    // 전역 변수에 데이터 저장
    allCompanies = companies;
    filteredCompanies = companies;

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

// 지역 선택기 초기화
function initializeLocationSelectors() {
    const districtData = {
        '서울특별시': ['강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구', '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구', '서초구', '성동구', '성북구', '송파구', '양천구', '영등포구', '용산구', '은평구', '종로구', '중구', '중랑구'],
        '경기도': ['고양시', '과천시', '광명시', '광주시', '구리시', '군포시', '김포시', '남양주시', '동두천시', '부천시', '성남시', '수원시', '시흥시', '안산시', '안성시', '안양시', '양주시', '오산시', '용인시', '의왕시', '의정부시', '이천시', '파주시', '평택시', '포천시', '하남시', '화성시'],
        '인천광역시': ['강화군', '계양구', '남동구', '동구', '미추홀구', '부평구', '서구', '연수구', '옹진군', '중구'],
        '부산광역시': ['강서구', '금정구', '기장군', '남구', '동구', '동래구', '부산진구', '북구', '사상구', '사하구', '서구', '수영구', '연제구', '영도구', '중구', '해운대구'],
        '대구광역시': ['남구', '달서구', '달성군', '동구', '북구', '서구', '수성구', '중구'],
        '대전광역시': ['대덕구', '동구', '서구', '유성구', '중구'],
        '광주광역시': ['광산구', '남구', '동구', '북구', '서구'],
        '울산광역시': ['남구', '동구', '북구', '울주군', '중구'],
        '세종특별자치시': ['세종특별자치시']
    };

    const citySelect = document.getElementById('citySelect');
    const districtSelect = document.getElementById('districtSelect');

    citySelect.addEventListener('change', function() {
        const selectedCity = this.value;
        districtSelect.innerHTML = '<option value="">구/군 선택</option>';

        if (selectedCity && districtData[selectedCity]) {
            districtData[selectedCity].forEach(district => {
                const option = document.createElement('option');
                option.value = district;
                option.textContent = district;
                districtSelect.appendChild(option);
            });
        }
    });
}

// 기업 검색 함수
function searchCompanies() {
    console.log('🔍 기업 검색 시작...');

    // 검색 조건 수집
    const filters = {
        city: document.getElementById('citySelect').value,
        district: document.getElementById('districtSelect').value,
        address: document.getElementById('addressInput').value.trim(),
        industry: document.getElementById('industrySelect').value,
        employeeMin: parseInt(document.getElementById('employeeMin').value) || null,
        employeeMax: parseInt(document.getElementById('employeeMax').value) || null,
        companyName: document.getElementById('companyNameInput').value.trim()
    };

    console.log('검색 조건:', filters);

    // 필터링 실행
    filteredCompanies = allCompanies.filter(company => {
        // 지역 필터링
        if (filters.city && !company.district?.includes(filters.city)) {
            return false;
        }
        if (filters.district && !company.district?.includes(filters.district)) {
            return false;
        }
        if (filters.address && !company.district?.toLowerCase().includes(filters.address.toLowerCase())) {
            return false;
        }

        // 업종 필터링
        if (filters.industry && !company.industry?.toLowerCase().includes(filters.industry.toLowerCase())) {
            return false;
        }

        // 임직원수 필터링
        if (filters.employeeMin && company.employee_count < filters.employeeMin) {
            return false;
        }
        if (filters.employeeMax && company.employee_count > filters.employeeMax) {
            return false;
        }

        // 기업명 필터링
        if (filters.companyName && !company.name?.toLowerCase().includes(filters.companyName.toLowerCase())) {
            return false;
        }

        return true;
    });

    console.log(`📊 검색 결과: ${filteredCompanies.length}개 기업`);

    // 검색 결과 표시
    updateCompanyListReal(filteredCompanies);
    updateSearchResultCount(filteredCompanies.length);
}

// 필터 초기화
function resetFilters() {
    document.getElementById('citySelect').value = '';
    document.getElementById('districtSelect').innerHTML = '<option value="">구/군 선택</option>';
    document.getElementById('addressInput').value = '';
    document.getElementById('industrySelect').value = '';
    document.getElementById('employeeMin').value = '';
    document.getElementById('employeeMax').value = '';
    document.getElementById('companyNameInput').value = '';

    // 전체 데이터 표시
    showAllCompanies();
}

// 전체 기업 보기
function showAllCompanies() {
    filteredCompanies = allCompanies;
    updateCompanyListReal(filteredCompanies);
    updateSearchResultCount(filteredCompanies.length);
    console.log('📋 전체 기업 표시:', filteredCompanies.length + '개');
}

// 검색 결과 개수 업데이트
function updateSearchResultCount(count) {
    const headerElement = document.querySelector('.card-header h5');
    if (headerElement && headerElement.textContent.includes('사무실 이전 기업 리스트')) {
        headerElement.textContent = `사무실 이전 기업 리스트 (${count}개)`;
    }
}

// 상세 정보 보기 (실제 데이터용)
function viewDetailsReal(companyName) {
    // TODO: 실제 상세 정보 모달 구현
    alert(`${companyName} 상세 정보\n\n- 사무실 이전 위험도 분석\n- 수집된 뉴스 및 공시 정보\n- 임대차 계약 정보\n- 사업 확장 계획\n\n(상세 정보 페이지 구현 예정)`);
}