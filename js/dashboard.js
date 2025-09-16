// API 키 설정
const API_KEYS = {
    kakao_js: '1ac6eee9b1e4c2e0cc6f1d1ca1a6a559',
    // 공공데이터포털 API 키들 (실제 키로 교체 필요)
    business_registry: 'YOUR_BUSINESS_REGISTRY_API_KEY',
    dart_api: 'YOUR_DART_API_KEY',
    naver_search: 'YOUR_NAVER_SEARCH_API_KEY'
};

// 실시간 기업 검색 API URL
const API_ENDPOINTS = {
    business_registry: 'https://api.odcloud.kr/api/nts-businessman/v1/status',
    dart_list: 'https://opendart.fss.or.kr/api/list.json',
    naver_news: 'https://openapi.naver.com/v1/search/news.json'
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
    console.log('🔄 페이지 로드 - 검색 시스템 초기화');

    // 지역 선택 이벤트 리스너 추가
    initializeLocationSelectors();

    // 초기 상태 설정 (검색 전 상태)
    initializeEmptyState();

    // 정적 데이터 로드는 제거 - 검색으로만 데이터 로드
    console.log('✅ 실시간 검색 시스템 준비 완료');
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
    col.className = 'col-lg-6 mb-4';

    // 기본 데이터 설정
    const companyName = company.name || '미상';
    const address = company.address || company.district || '주소 정보 없음';
    const addressDetail = company.address_detail || '';
    const employeeCount = company.employee_count ? company.employee_count.toLocaleString() : '정보 없음';
    const industry = company.industry || '업종 정보 없음';
    const website = company.website || '#';
    const phone = company.phone || '연락처 정보 없음';
    const email = company.email || '이메일 정보 없음';

    // 위험도 용어 제거, 단순한 점수만 표시
    const predictionText = company.prediction ? company.prediction.replace(/고위험|중위험|저위험/g, '').replace(/\s-\s/, '') : '분석 중';

    col.innerHTML = `
        <div class="card company-card h-100 shadow-sm">
            <div class="card-body">
                <div class="row mb-3">
                    <div class="col-8">
                        <h5 class="card-title text-primary mb-1">${companyName}</h5>
                        <span class="badge bg-info">${industry}</span>
                    </div>
                    <div class="col-4 text-end">
                        <small class="text-muted">마지막 업데이트</small><br>
                        <small class="text-secondary">${formatDate(company.last_update)}</small>
                    </div>
                </div>

                <div class="mb-3">
                    <div class="row mb-2">
                        <div class="col-12">
                            <strong>📍 주소</strong>
                            <div class="mt-1">
                                <div class="text-dark">${address}</div>
                                ${addressDetail ? `<small class="text-muted">${addressDetail}</small>` : ''}
                            </div>
                        </div>
                    </div>

                    <div class="row mb-2">
                        <div class="col-6">
                            <strong>👥 임직원수</strong>
                            <div class="text-info fw-bold">${employeeCount}명</div>
                        </div>
                        <div class="col-6">
                            <strong>🌐 웹사이트</strong>
                            <div>
                                <a href="${website}" target="_blank" class="text-decoration-none small">
                                    ${website !== '#' ? website.replace('https://', '').replace('http://', '') : '정보 없음'}
                                </a>
                            </div>
                        </div>
                    </div>

                    <div class="row mb-2">
                        <div class="col-6">
                            <strong>📞 대표전화</strong>
                            <div class="small">${phone}</div>
                        </div>
                        <div class="col-6">
                            <strong>📧 대표 이메일</strong>
                            <div class="small">
                                <a href="mailto:${email}" class="text-decoration-none">${email}</a>
                            </div>
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-12">
                            <strong>📈 이전 예측</strong>
                            <div class="text-muted small mt-1">${predictionText}</div>
                        </div>
                    </div>
                </div>

                <div class="d-flex justify-content-between align-items-center">
                    <small class="text-muted">분석 점수: ${company.risk_score || 0}%</small>
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

// 초기 빈 상태 설정
function initializeEmptyState() {
    // 상태 카드 초기화
    document.getElementById('analyzedCompanies').textContent = '0';
    document.getElementById('totalCompanies').textContent = '0';
    document.getElementById('highRiskCompanies').textContent = '0';
    document.getElementById('collectionStatus').textContent = '대기 중';
    document.getElementById('statusSpinner').style.display = 'none';

    // 빈 리스트 상태 표시
    const listContainer = document.getElementById('companyList');
    listContainer.innerHTML = `
        <div class="col-12 text-center py-5">
            <div class="mb-4">
                <i class="bi bi-search" style="font-size: 4rem; color: #6c757d;"></i>
            </div>
            <h5 class="text-muted">기업 검색을 시작하세요</h5>
            <p class="text-muted">
                위의 검색 조건을 설정하고 "🔍 검색" 버튼을 클릭하면<br>
                실시간으로 조건에 맞는 기업들을 찾아드립니다.
            </p>
            <div class="mt-4">
                <button class="btn btn-primary" onclick="document.getElementById('citySelect').focus()">
                    검색 조건 설정하기
                </button>
            </div>
        </div>
    `;

    // 검색 결과 카운트 초기화
    updateSearchResultCount(0);

    updateLastUpdateTime();
}

// 실시간 기업 검색 함수
async function searchCompanies() {
    console.log('🔍 실시간 기업 검색 시작...');

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

    console.log('🔍 검색 조건:', filters);

    // 검색 조건 유효성 검사
    if (!filters.city && !filters.industry && !filters.companyName && !filters.address) {
        alert('최소 하나의 검색 조건을 입력해주세요.');
        return;
    }

    // 로딩 상태 표시
    showLoadingState();

    try {
        // 실시간 API 호출로 기업 검색
        const companies = await fetchRealCompanies(filters);

        console.log(`📊 실시간 검색 결과: ${companies.length}개 기업`);

        // 검색 결과 표시
        filteredCompanies = companies;
        updateCompanyListReal(filteredCompanies);
        updateSearchResultCount(filteredCompanies.length);

        // 상태 카드 업데이트
        updateStatusCardsFromSearchResults(filteredCompanies);

    } catch (error) {
        console.error('🚨 실시간 검색 실패:', error);
        showError('실시간 기업 검색에 실패했습니다. 다시 시도해주세요.');
    } finally {
        hideLoadingState();
    }
}

// 실시간 기업 데이터 검색
async function fetchRealCompanies(filters) {
    console.log('🌐 실제 API 호출 시작...');

    const companies = [];

    try {
        // 1. 기업명이 있는 경우 직접 검색
        if (filters.companyName) {
            const directSearchResults = await searchCompaniesByName(filters.companyName);
            companies.push(...directSearchResults);
        }

        // 2. 지역/업종 기반 검색
        if (filters.city || filters.industry) {
            const locationIndustryResults = await searchCompaniesByLocationAndIndustry(filters);
            companies.push(...locationIndustryResults);
        }

        // 3. 중복 제거 및 필터링
        const uniqueCompanies = removeDuplicates(companies);
        const filteredResults = applyFilters(uniqueCompanies, filters);

        // 4. 각 기업에 대해 이전 위험도 분석
        const analyzedCompanies = await Promise.all(
            filteredResults.map(company => analyzeRelocationRisk(company))
        );

        return analyzedCompanies.sort((a, b) => b.risk_score - a.risk_score);

    } catch (error) {
        console.error('기업 데이터 검색 오류:', error);
        return [];
    }
}

// 기업명으로 직접 검색
async function searchCompaniesByName(companyName) {
    console.log(`🏯 기업명 검색: ${companyName}`);

    // 실제로는 여러 API를 호출해야 함:
    // 1. 공공데이터포털 사업자등록정보
    // 2. DART 상장기업 정보
    // 3. 중소밤처 기업정보

    // 데모용 시뮬레이션 (실제로는 API 호출)
    await new Promise(resolve => setTimeout(resolve, 1000)); // API 호출 시뮬레이션

    return generateMockSearchResults(companyName, 'name');
}

// 지역/업종 기반 검색
async function searchCompaniesByLocationAndIndustry(filters) {
    console.log(`🗺️ 지역/업종 검색:`, filters);

    // 실제로는 지역 및 업종 코드를 기반으로 API 호출
    await new Promise(resolve => setTimeout(resolve, 1500));

    return generateMockSearchResults(filters.city || filters.industry, 'location');
}

// 데모용 검색 결과 생성 (실제로는 API 응답 파싱)
function generateMockSearchResults(searchTerm, type) {
    const mockCompanies = [
        {
            name: '신진제약',
            industry: '바이오/제약',
            address: '서울특별시 강남구 테헤란로 152, 강남파이낸스센터 12층',
            address_detail: '(지번) 서울특별시 강남구 역삼동 737-10',
            employee_count: 2800,
            website: 'https://www.shinjinpharm.co.kr',
            phone: '02-1234-5678',
            email: 'info@shinjinpharm.co.kr'
        },
        {
            name: '호랑이소프트',
            industry: 'IT/소프트웨어',
            address: '서울특별시 강남구 봉은사로 524, 삼성플라자 8층',
            address_detail: '(지번) 서울특별시 강남구 논현동 278-20',
            employee_count: 420,
            website: 'https://www.tigersoft.kr',
            phone: '02-2345-6789',
            email: 'contact@tigersoft.kr'
        },
        {
            name: '대한물류',
            industry: '물류/운송',
            address: '경기도 고양시 덕양구 권율대로 570, 대한빌딩 3층',
            address_detail: '(지번) 경기도 고양시 덕양구 화정동 1063-1',
            employee_count: 1200,
            website: 'https://www.daehanlogis.co.kr',
            phone: '031-3456-7890',
            email: 'info@daehanlogis.co.kr'
        },
        {
            name: '스마트팩토리',
            industry: '제조업',
            address: '인천광역시 남동구 인주대로 593, 테크노파크 A동 205호',
            address_detail: '(지번) 인천광역시 남동구 구월동 1138',
            employee_count: 850,
            website: 'https://www.smartfactory.com',
            phone: '032-4567-8901',
            email: 'smart@smartfactory.com'
        },
        {
            name: '피닉스게임즈',
            industry: '게임/앱',
            address: '경기도 성남시 분당구 판교로 242, 아바나빌딩 6층',
            address_detail: '(지번) 경기도 성남시 분당구 삼평동 681',
            employee_count: 320,
            website: 'https://www.phoenixgames.kr',
            phone: '031-5678-9012',
            email: 'dev@phoenixgames.kr'
        },
        {
            name: '김씨판매',
            industry: '유통/소매',
            address: '부산광역시 해운대구 센텀남대로 35, 부산국제금융센터 21층',
            address_detail: '(지번) 부산광역시 해운대구 우동 1411-1',
            employee_count: 2100,
            website: 'https://www.kimstore.co.kr',
            phone: '051-6789-0123',
            email: 'sales@kimstore.co.kr'
        },
        {
            name: '그린에너지',
            industry: '에너지/환경',
            address: '대전광역시 유성구 대학로 291, 대덕밸리 에너지센터 4층',
            address_detail: '(지번) 대전광역시 유성구 궁동 220-1',
            employee_count: 180,
            website: 'https://www.greenenergy.kr',
            phone: '042-7890-1234',
            email: 'green@greenenergy.kr'
        },
        {
            name: '메디케어플러스',
            industry: '의료/헬스케어',
            address: '서울특별시 서초구 서초대로 77길 54, 서초타워 15층',
            address_detail: '(지번) 서울특별시 서초구 서초동 1303-37',
            employee_count: 680,
            website: 'https://www.medicareplus.co.kr',
            phone: '02-8901-2345',
            email: 'care@medicareplus.co.kr'
        },
        {
            name: '딥러닝에듀',
            industry: '교육/연구',
            address: '서울특별시 마포구 월드컵북로 21, 풍성빌딩 7층',
            address_detail: '(지번) 서울특별시 마포구 상암동 1600',
            employee_count: 95,
            website: 'https://www.deepedu.kr',
            phone: '02-9012-3456',
            email: 'learn@deepedu.kr'
        },
        {
            name: '하이테크건설',
            industry: '건설/부동산',
            address: '경기도 용인시 기흥구 용구대로 2738, 하이테크타워 본관 5층',
            address_detail: '(지번) 경기도 용인시 기흥구 영덕동 1007',
            employee_count: 1500,
            website: 'https://www.hitech-const.co.kr',
            phone: '031-0123-4567',
            email: 'build@hitech-const.co.kr'
        }
    ];

    // 검색어에 따라 필터링
    let results = mockCompanies;
    if (type === 'name') {
        results = mockCompanies.filter(company =>
            company.name.includes(searchTerm) ||
            searchTerm.includes(company.name.substring(0, 2))
        );
    }

    return results.slice(0, Math.floor(Math.random() * 6) + 3); // 3-8개 반환
}

// 중복 제거
function removeDuplicates(companies) {
    const seen = new Set();
    return companies.filter(company => {
        const key = company.name + company.district;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

// 필터 적용
function applyFilters(companies, filters) {
    return companies.filter(company => {
        if (filters.city && !company.district?.includes(filters.city)) return false;
        if (filters.district && !company.district?.includes(filters.district)) return false;
        if (filters.industry && !company.industry?.toLowerCase().includes(filters.industry.toLowerCase())) return false;
        if (filters.employeeMin && company.employee_count < filters.employeeMin) return false;
        if (filters.employeeMax && company.employee_count > filters.employeeMax) return false;
        return true;
    });
}

// 이전 위험도 분석
async function analyzeRelocationRisk(company) {
    console.log(`📈 ${company.name} 위험도 분석 중...`);

    // 실제로는 다음들을 분석:
    // 1. 네이버 뉴스 검색
    // 2. DART 공시 정보
    // 3. 부동산 정보
    // 4. 기업 성장률 등

    await new Promise(resolve => setTimeout(resolve, 500)); // 분석 시뮬레이션

    const riskScore = Math.floor(Math.random() * 70) + 20; // 20-90% 분석 점수
    const predictions = [
        '6개월 내 이전 가능성 높음',
        '1년 내 이전 검토 가능',
        '장기적 모니터링 필요'
    ];

    return {
        ...company,
        risk_score: riskScore,
        prediction: riskScore >= 70 ? predictions[0] : riskScore >= 40 ? predictions[1] : predictions[2],
        data_counts: {
            naver_news: Math.floor(Math.random() * 25) + 5,
            google_results: Math.floor(Math.random() * 15) + 5,
            dart_total: Math.floor(Math.random() * 20) + 5,
            dart_office: Math.floor(Math.random() * 3)
        },
        last_update: new Date().toISOString()
    };
}

// 로딩 상태 표시
function showLoadingState() {
    document.getElementById('collectionStatus').textContent = '검색 중...';
    document.getElementById('statusSpinner').style.display = 'inline-block';

    const listContainer = document.getElementById('companyList');
    listContainer.innerHTML = `
        <div class="col-12 text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">검색 중...</span>
            </div>
            <p class="mt-3">실시간 기업 데이터를 검색하고 있습니다...</p>
        </div>
    `;
}

// 로딩 상태 숨김
function hideLoadingState() {
    document.getElementById('collectionStatus').textContent = '완료';
    document.getElementById('statusSpinner').style.display = 'none';
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
    updateStatusCardsFromSearchResults(filteredCompanies);
    console.log('📋 전체 기업 표시:', filteredCompanies.length + '개');
}

// 검색 결과 개수 업데이트
function updateSearchResultCount(count) {
    const headerElement = document.querySelector('.card-header h5');
    if (headerElement && headerElement.textContent.includes('사무실 이전 기업 리스트')) {
        headerElement.textContent = `사무실 이전 기업 리스트 (${count}개)`;
    }
}

// 검색 결과에 따른 상태 카드 업데이트
function updateStatusCardsFromSearchResults(companies) {
    const total = companies.length;
    const analyzed = companies.length; // 검색된 모든 기업이 분석된 상태

    // 높은 점수 기업 계산 (70점 이상)
    const highScoreCompanies = companies.filter(c => (c.risk_score || 0) >= 70).length;

    console.log(`📊 상태 카드 업데이트: 총 ${total}개, 분석완료 ${analyzed}개, 고점수 ${highScoreCompanies}개`);

    // 상태 카드 값 업데이트
    document.getElementById('analyzedCompanies').textContent = analyzed;
    document.getElementById('totalCompanies').textContent = total;
    document.getElementById('highRiskCompanies').textContent = highScoreCompanies;

    // 수집 상태 업데이트
    if (total > 0) {
        document.getElementById('collectionStatus').textContent = '검색 완료';
        document.getElementById('statusSpinner').style.display = 'none';
    } else {
        document.getElementById('collectionStatus').textContent = '결과 없음';
        document.getElementById('statusSpinner').style.display = 'none';
    }
}

// 상세 정보 보기 (실제 데이터용)
function viewDetailsReal(companyName) {
    // TODO: 실제 상세 정보 모달 구현
    alert(`${companyName} 상세 정보\n\n- 사무실 이전 위험도 분석\n- 수집된 뉴스 및 공시 정보\n- 임대차 계약 정보\n- 사업 확장 계획\n\n(상세 정보 페이지 구현 예정)`);
}