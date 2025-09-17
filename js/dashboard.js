// Firebase Functions 통합 dashboard.js - 실제 API 데이터만 사용

// 전역 변수
let allCompanies = [];
let filteredCompanies = [];
let currentModalCompany = null;
let isSearching = false;

// Firebase Functions 기본 URL (전역 변수에서 가져오기)
const FIREBASE_FUNCTIONS_BASE_URL = window.FIREBASE_FUNCTIONS_BASE_URL || 'https://us-central1-office-relocation-predic-df116.cloudfunctions.net';

// Firebase Functions API 클래스
class FirebaseAPI {
    static async searchNaverNews(query, options = {}) {
        const url = `${FIREBASE_FUNCTIONS_BASE_URL}/searchNaverNewsHttp`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query,
                display: options.display || 50,
                start: options.start || 1,
                sort: options.sort || 'date'
            })
        });
        return await response.json();
    }

    static async searchNaverBlog(query, options = {}) {
        const url = `${FIREBASE_FUNCTIONS_BASE_URL}/searchNaverBlogHttp`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query,
                display: options.display || 30,
                start: options.start || 1,
                sort: options.sort || 'date'
            })
        });
        return await response.json();
    }

    static async searchDartAPI(corpName, options = {}) {
        const url = `${FIREBASE_FUNCTIONS_BASE_URL}/searchDartAPIHttp`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                corp_name: corpName,
                bgn_de: options.beginDate || '20231201',
                end_de: options.endDate || '20241201',
                page_no: options.pageNo || 1,
                page_count: options.pageCount || 10
            })
        });
        return await response.json();
    }

    static async searchAllAPIs(searchParams) {
        const url = `${FIREBASE_FUNCTIONS_BASE_URL}/searchAllAPIs`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(searchParams)
        });
        return await response.json();
    }
}

// 기업 데이터 분석 및 위험도 계산
class CompanyAnalyzer {
    static analyzeCompanyData(newsData, blogData, dartData, companyName) {
        let riskScore = 50; // 기본 점수
        let signals = [];
        let prediction = '정보 부족';

        // 뉴스 데이터 분석
        if (newsData && newsData.items) {
            const newsCount = newsData.items.length;
            const recentNews = newsData.items.filter(item => {
                const newsDate = new Date(item.pubDate);
                const oneMonthAgo = new Date();
                oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
                return newsDate >= oneMonthAgo;
            });

            // 이전 관련 키워드 분석
            const relocationKeywords = ['이전', '신사옥', '확장', '투자', '채용', '성장'];
            const positiveNews = newsData.items.filter(item =>
                relocationKeywords.some(keyword =>
                    item.title.includes(keyword) || item.description.includes(keyword)
                )
            );

            if (positiveNews.length > 0) {
                riskScore += 20;
                signals.push('사옥 이전 관련 뉴스');
            }

            if (recentNews.length > 5) {
                riskScore += 10;
                signals.push('최근 언론 노출 증가');
            }
        }

        // 블로그 데이터 분석
        if (blogData && blogData.items) {
            const blogCount = blogData.items.length;
            if (blogCount > 10) {
                riskScore += 5;
                signals.push('온라인 관심도 증가');
            }
        }

        // DART 공시 데이터 분석
        if (dartData && dartData.list) {
            const recentDisclosures = dartData.list.filter(item => {
                const disclosureDate = new Date(item.rcept_dt);
                const threeMonthsAgo = new Date();
                threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
                return disclosureDate >= threeMonthsAgo;
            });

            if (recentDisclosures.length > 0) {
                riskScore += 15;
                signals.push('최근 공시 활동');
            }

            // 특별한 공시 유형 확인
            const importantDisclosures = dartData.list.filter(item =>
                item.report_nm.includes('투자') ||
                item.report_nm.includes('증자') ||
                item.report_nm.includes('합병') ||
                item.report_nm.includes('분할')
            );

            if (importantDisclosures.length > 0) {
                riskScore += 20;
                signals.push('중요 기업 활동');
            }
        }

        // 위험도에 따른 예측 설정
        if (riskScore >= 80) {
            prediction = '3-6개월 내 사옥 이전 가능성 높음';
        } else if (riskScore >= 60) {
            prediction = '6-12개월 내 사옥 이전 검토 가능성';
        } else if (riskScore >= 40) {
            prediction = '현재 안정적 운영, 단기 이전 가능성 낮음';
        } else {
            prediction = '충분한 정보 없음';
        }

        return {
            riskScore: Math.min(riskScore, 100),
            signals,
            prediction
        };
    }
}

// 검색 기능
async function searchCompanies() {
    if (isSearching) {
        console.log('검색이 이미 진행 중입니다.');
        return;
    }

    isSearching = true;

    try {
        // 검색 UI 업데이트
        updateSearchStatus('검색 중...', true);

        // 검색 조건 수집
        const searchQuery = document.getElementById('companyNameInput').value.trim();
        const selectedIndustry = document.getElementById('industrySelect').value;
        const selectedLocation = document.getElementById('citySelect').value;
        const riskRange = 50; // 기본값

        if (!searchQuery) {
            alert('검색할 기업명을 입력해주세요.');
            return;
        }

        console.log('검색 시작:', { searchQuery, selectedIndustry, selectedLocation, riskRange });

        // Firebase Functions를 통한 통합 API 검색
        const searchParams = {
            companyName: searchQuery,
            industry: selectedIndustry || '',
            location: selectedLocation || '',
            riskThreshold: parseInt(riskRange) || 50
        };

        updateSearchStatus('API 데이터 수집 중...', true);

        const apiResults = await FirebaseAPI.searchAllAPIs(searchParams);
        console.log('API 검색 결과:', apiResults);

        // 결과 데이터 처리
        allCompanies = [];

        if (apiResults.success) {
            const { newsData, blogData, dartData } = apiResults.data;

            // 수집된 데이터를 기반으로 기업 정보 생성
            const companies = await processAPIResults(newsData, blogData, dartData, searchQuery);
            allCompanies = companies;
        } else {
            console.error('API 검색 실패:', apiResults.error);
            // 실패시 기본 검색 시도
            allCompanies = await performFallbackSearch(searchQuery);
        }

        // 필터 적용
        applyFilters();

        // 결과 표시
        displayResults();
        updateStats();

        updateSearchStatus(`검색 완료 - ${allCompanies.length}개 기업 발견`, false);

    } catch (error) {
        console.error('검색 중 오류:', error);
        updateSearchStatus('검색 중 오류가 발생했습니다.', false);
        allCompanies = [];
        displayResults();
    } finally {
        isSearching = false;
    }
}

// API 결과 처리
async function processAPIResults(newsData, blogData, dartData, searchQuery) {
    const companies = [];

    try {
        // 뉴스 데이터에서 기업 정보 추출
        if (newsData && newsData.items) {
            const newsItems = newsData.items.slice(0, 10); // 상위 10개 뉴스

            for (const newsItem of newsItems) {
                const companyName = extractCompanyName(newsItem.title, searchQuery);
                if (companyName && !companies.find(c => c.name === companyName)) {

                    // 개별 기업 데이터 분석
                    const analysis = CompanyAnalyzer.analyzeCompanyData(
                        newsData, blogData, dartData, companyName
                    );

                    const company = {
                        name: companyName,
                        industry: inferIndustry(newsItem.title + ' ' + newsItem.description),
                        address: extractAddress(newsItem.description) || '주소 정보 없음',
                        district: extractDistrict(newsItem.description) || '지역 정보 없음',
                        employee_count: estimateEmployeeCount(newsItem.description),
                        business_type: inferBusinessType(newsItem.description),
                        risk_score: analysis.riskScore,
                        prediction: analysis.prediction,
                        signals: analysis.signals,
                        last_update: new Date().toISOString(),
                        news_summary: newsItem.title,
                        news_link: newsItem.link
                    };

                    companies.push(company);
                }
            }
        }

        // DART 데이터에서 추가 기업 정보
        if (dartData && dartData.list) {
            for (const dartItem of dartData.list) {
                const companyName = dartItem.corp_name;
                if (companyName && !companies.find(c => c.name === companyName)) {

                    const analysis = CompanyAnalyzer.analyzeCompanyData(
                        newsData, blogData, dartData, companyName
                    );

                    const company = {
                        name: companyName,
                        industry: '상장기업',
                        address: '주소 조회 필요',
                        district: '지역 정보 없음',
                        employee_count: null,
                        business_type: '상장기업',
                        risk_score: analysis.riskScore,
                        prediction: analysis.prediction,
                        signals: analysis.signals,
                        last_update: new Date().toISOString(),
                        dart_summary: dartItem.report_nm,
                        dart_link: `http://dart.fss.or.kr/dsaf001/main.do?rcpNo=${dartItem.rcept_no}`
                    };

                    companies.push(company);
                }
            }
        }

        // 검색 결과가 없으면 검색어 기반 가상 기업 생성 (최소한의 정보)
        if (companies.length === 0) {
            companies.push({
                name: searchQuery,
                industry: '분류 필요',
                address: '주소 조회 필요',
                district: '지역 미상',
                employee_count: null,
                business_type: '정보 부족',
                risk_score: 50,
                prediction: '추가 정보 수집 필요',
                signals: ['검색 결과 기반'],
                last_update: new Date().toISOString()
            });
        }

        return companies;

    } catch (error) {
        console.error('API 결과 처리 중 오류:', error);
        return [];
    }
}

// 폴백 검색 (API 실패시)
async function performFallbackSearch(searchQuery) {
    try {
        console.log('폴백 검색 수행:', searchQuery);

        // 개별 API 호출 시도
        const newsPromise = FirebaseAPI.searchNaverNews(searchQuery + ' 기업');
        const blogPromise = FirebaseAPI.searchNaverBlog(searchQuery + ' 회사');
        const dartPromise = FirebaseAPI.searchDartAPI(searchQuery);

        const [newsResult, blogResult, dartResult] = await Promise.allSettled([
            newsPromise, blogPromise, dartPromise
        ]);

        const newsData = newsResult.status === 'fulfilled' ? newsResult.value : null;
        const blogData = blogResult.status === 'fulfilled' ? blogResult.value : null;
        const dartData = dartResult.status === 'fulfilled' ? dartResult.value : null;

        return await processAPIResults(newsData, blogData, dartData, searchQuery);

    } catch (error) {
        console.error('폴백 검색 실패:', error);
        return [];
    }
}

// 유틸리티 함수들
function extractCompanyName(title, searchQuery) {
    // 제목에서 회사명 추출 로직
    const patterns = [
        /([가-힣A-Za-z]+)(?:주식회사|㈜|\s+Inc\.|\s+Corp\.|\s+Co\.)/,
        new RegExp(`(${searchQuery})`, 'i'),
        /([가-힣]{2,10})(그룹|전자|화학|바이오|테크)/
    ];

    for (const pattern of patterns) {
        const match = title.match(pattern);
        if (match) return match[1].trim();
    }

    return searchQuery;
}

function inferIndustry(text) {
    const industryKeywords = {
        'IT/소프트웨어': ['IT', '소프트웨어', '앱', '플랫폼', '테크', '디지털'],
        '제조업': ['제조', '생산', '공장', '제품'],
        '금융업': ['금융', '은행', '보험', '투자'],
        '바이오/제약': ['바이오', '제약', '의료', '헬스케어'],
        '유통/소매': ['유통', '소매', '쇼핑', '이커머스'],
        '건설/부동산': ['건설', '부동산', '시공', '개발']
    };

    for (const [industry, keywords] of Object.entries(industryKeywords)) {
        if (keywords.some(keyword => text.includes(keyword))) {
            return industry;
        }
    }

    return '기타';
}

function extractAddress(text) {
    const addressPattern = /(서울|부산|대구|인천|광주|대전|울산|경기|강원|충북|충남|전북|전남|경북|경남|제주)[^\s]*[시군구][^\s]*[동로가]/;
    const match = text.match(addressPattern);
    return match ? match[0] : null;
}

function extractDistrict(text) {
    const districtPattern = /(서울|부산|대구|인천|광주|대전|울산|경기|강원|충북|충남|전북|전남|경북|경남|제주)[^\s]*[시군]/;
    const match = text.match(districtPattern);
    return match ? match[0] : null;
}

function estimateEmployeeCount(text) {
    const employeePatterns = [
        /(\d+)명/,
        /직원\s*(\d+)/,
        /인력\s*(\d+)/
    ];

    for (const pattern of employeePatterns) {
        const match = text.match(pattern);
        if (match) return parseInt(match[1]);
    }

    return null;
}

function inferBusinessType(text) {
    if (text.includes('상장') || text.includes('코스피') || text.includes('코스닥')) {
        return '상장기업';
    }
    if (text.includes('중소기업') || text.includes('스타트업')) {
        return '중소기업';
    }
    if (text.includes('대기업') || text.includes('그룹')) {
        return '대기업';
    }
    return '일반기업';
}

// 검색 상태 업데이트
function updateSearchStatus(message, isLoading) {
    const statusElement = document.getElementById('collectionStatus');
    const spinnerElement = document.getElementById('statusSpinner');

    if (statusElement) {
        statusElement.textContent = message;
    }

    if (spinnerElement) {
        spinnerElement.style.display = isLoading ? 'inline-block' : 'none';
    }

    // HTML에 onclick으로 정의된 검색 버튼을 찾아서 비활성화
    const searchButtons = document.querySelectorAll('button[onclick*="searchCompanies"]');
    searchButtons.forEach(button => {
        button.disabled = isLoading;
        if (isLoading) {
            button.innerHTML = '🔄 검색 중...';
        } else {
            button.innerHTML = '🔍 검색';
        }
    });
}

// 필터 적용
function applyFilters() {
    const selectedIndustry = document.getElementById('industrySelect').value;
    const selectedLocation = document.getElementById('citySelect').value;
    const selectedDistrict = document.getElementById('districtSelect')?.value || '';
    const riskRange = 50; // 기본값

    filteredCompanies = allCompanies.filter(company => {
        const industryMatch = !selectedIndustry || company.industry.includes(selectedIndustry);
        const locationMatch = !selectedLocation || company.district.includes(selectedLocation);
        const districtMatch = !selectedDistrict || company.address.includes(selectedDistrict);
        const riskMatch = company.risk_score >= parseInt(riskRange);

        return industryMatch && locationMatch && districtMatch && riskMatch;
    });
}

// 결과 표시
function displayResults() {
    const resultsContainer = document.getElementById('companyList');
    if (!resultsContainer) return;

    if (filteredCompanies.length === 0) {
        resultsContainer.innerHTML = `
            <div class="no-results">
                <p>검색 결과가 없습니다.</p>
                <p>다른 검색어나 필터 조건을 시도해보세요.</p>
            </div>
        `;
        return;
    }

    resultsContainer.innerHTML = filteredCompanies.map(company => `
        <div class="company-card" onclick="showCompanyDetail('${company.name}')">
            <div class="company-header">
                <h3 class="company-name">${company.name}</h3>
                <div class="risk-score ${getRiskLevel(company.risk_score)}">${company.risk_score}</div>
            </div>
            <div class="company-info">
                <p class="industry">${company.industry}</p>
                <p class="address">${company.address}</p>
                <p class="prediction">${company.prediction}</p>
            </div>
            <div class="company-signals">
                ${company.signals.map(signal => `<span class="signal-tag">${signal}</span>`).join('')}
            </div>
        </div>
    `).join('');
}

// 통계 업데이트
function updateStats() {
    const totalCount = document.getElementById('totalCompanies');
    const analyzedCount = document.getElementById('analyzedCompanies');
    const highRiskCount = document.getElementById('highRiskCompanies');
    const statusElement = document.getElementById('collectionStatus');

    if (totalCount) totalCount.textContent = filteredCompanies.length;
    if (analyzedCount) analyzedCount.textContent = filteredCompanies.length;

    const highRisk = filteredCompanies.filter(c => c.risk_score >= 70).length;
    if (highRiskCount) highRiskCount.textContent = highRisk;

    if (statusElement) {
        statusElement.textContent = filteredCompanies.length > 0 ? '검색 완료' : '대기 중';
    }
}

// 위험도 레벨 계산
function getRiskLevel(score) {
    if (score >= 80) return 'high-risk';
    if (score >= 60) return 'medium-risk';
    return 'low-risk';
}

// 기업 상세 정보 표시
async function showCompanyDetail(companyName) {
    const company = allCompanies.find(c => c.name === companyName);
    if (!company) return;

    currentModalCompany = company;

    try {
        // 추가 데이터 수집
        updateModalContent(company);
        document.getElementById('companyDetailModal').style.display = 'block';

        // 백그라운드에서 상세 정보 업데이트
        await enrichCompanyData(company);

    } catch (error) {
        console.error('기업 상세 정보 로드 실패:', error);
    }
}

// 기업 데이터 보강
async function enrichCompanyData(company) {
    try {
        const [newsResult, blogResult, dartResult] = await Promise.allSettled([
            FirebaseAPI.searchNaverNews(company.name + ' 사옥 이전'),
            FirebaseAPI.searchNaverBlog(company.name + ' 확장'),
            FirebaseAPI.searchDartAPI(company.name)
        ]);

        const enrichedData = {
            detailedNews: newsResult.status === 'fulfilled' ? newsResult.value : null,
            detailedBlogs: blogResult.status === 'fulfilled' ? blogResult.value : null,
            detailedDart: dartResult.status === 'fulfilled' ? dartResult.value : null
        };

        // 모달 업데이트
        updateModalContent(company, enrichedData);

    } catch (error) {
        console.error('데이터 보강 실패:', error);
    }
}

// 모달 콘텐츠 업데이트
function updateModalContent(company, enrichedData = null) {
    document.getElementById('modalCompanyName').textContent = company.name;
    document.getElementById('modalIndustry').textContent = company.industry;
    document.getElementById('modalAddress').textContent = company.address;
    document.getElementById('modalRiskScore').textContent = company.risk_score;
    document.getElementById('modalRiskScore').className = `risk-score ${getRiskLevel(company.risk_score)}`;
    document.getElementById('modalPrediction').textContent = company.prediction;

    // 신호 업데이트
    const signalsContainer = document.getElementById('modalSignals');
    signalsContainer.innerHTML = company.signals.map(signal =>
        `<span class="signal-tag">${signal}</span>`
    ).join('');

    // 상세 데이터가 있으면 추가 표시
    if (enrichedData) {
        updateEnrichedData(enrichedData);
    }
}

// 보강된 데이터 표시
function updateEnrichedData(enrichedData) {
    const { detailedNews, detailedBlogs, detailedDart } = enrichedData;

    // 뉴스 섹션 업데이트
    const newsSection = document.getElementById('modalNewsSection');
    if (newsSection && detailedNews && detailedNews.items) {
        const newsHTML = detailedNews.items.slice(0, 5).map(item => `
            <div class="news-item">
                <h4><a href="${item.link}" target="_blank">${item.title}</a></h4>
                <p>${item.description}</p>
                <small>${new Date(item.pubDate).toLocaleDateString()}</small>
            </div>
        `).join('');
        newsSection.innerHTML = `<h3>관련 뉴스</h3>${newsHTML}`;
    }

    // DART 섹션 업데이트
    const dartSection = document.getElementById('modalDartSection');
    if (dartSection && detailedDart && detailedDart.list) {
        const dartHTML = detailedDart.list.slice(0, 3).map(item => `
            <div class="dart-item">
                <h4>${item.report_nm}</h4>
                <p>제출일: ${item.rcept_dt}</p>
                <small>공시 유형: ${item.corp_cls}</small>
            </div>
        `).join('');
        dartSection.innerHTML = `<h3>공시 정보</h3>${dartHTML}`;
    }
}

// 모달 닫기
function closeModal() {
    document.getElementById('companyDetailModal').style.display = 'none';
    currentModalCompany = null;
}

// 지역 데이터
const LOCATION_DATA = {
    '서울특별시': ['강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구', '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구', '서초구', '성동구', '성북구', '송파구', '양천구', '영등포구', '용산구', '은평구', '종로구', '중구', '중랑구'],
    '부산광역시': ['강서구', '금정구', '기장군', '남구', '동구', '동래구', '부산진구', '북구', '사상구', '사하구', '서구', '수영구', '연제구', '영도구', '중구', '해운대구'],
    '대구광역시': ['남구', '달서구', '달성군', '동구', '북구', '서구', '수성구', '중구'],
    '인천광역시': ['강화군', '계양구', '미추홀구', '남동구', '동구', '부평구', '서구', '연수구', '옹진군', '중구'],
    '광주광역시': ['광산구', '남구', '동구', '북구', '서구'],
    '대전광역시': ['대덕구', '동구', '서구', '유성구', '중구'],
    '울산광역시': ['남구', '동구', '북구', '울주군', '중구'],
    '경기도': ['가평군', '고양시', '과천시', '광명시', '광주시', '구리시', '군포시', '김포시', '남양주시', '동두천시', '부천시', '성남시', '수원시', '시흥시', '안산시', '안성시', '안양시', '양주시', '양평군', '여주시', '연천군', '오산시', '용인시', '의왕시', '의정부시', '이천시', '파주시', '평택시', '포천시', '하남시', '화성시'],
    '강원도': ['강릉시', '고성군', '동해시', '삼척시', '속초시', '양구군', '양양군', '영월군', '원주시', '인제군', '정선군', '철원군', '춘천시', '태백시', '평창군', '홍천군', '화천군', '횡성군'],
    '충청북도': ['괴산군', '단양군', '보은군', '영동군', '옥천군', '음성군', '제천시', '진천군', '청주시', '충주시', '증평군'],
    '충청남도': ['계룡시', '공주시', '금산군', '논산시', '당진시', '보령시', '부여군', '서산시', '서천군', '아산시', '예산군', '천안시', '청양군', '태안군', '홍성군'],
    '전라북도': ['고창군', '군산시', '김제시', '남원시', '무주군', '부안군', '순창군', '완주군', '익산시', '임실군', '장수군', '전주시', '정읍시', '진안군'],
    '전라남도': ['강진군', '고흥군', '곡성군', '광양시', '구례군', '나주시', '담양군', '목포시', '무안군', '보성군', '순천시', '신안군', '여수시', '영광군', '영암군', '완도군', '장성군', '장흥군', '진도군', '함평군', '해남군', '화순군'],
    '경상북도': ['경산시', '경주시', '고령군', '구미시', '군위군', '김천시', '문경시', '봉화군', '상주시', '성주군', '안동시', '영덕군', '영양군', '영주시', '영천시', '예천군', '울릉군', '울진군', '의성군', '청도군', '청송군', '칠곡군', '포항시'],
    '경상남도': ['거제시', '거창군', '고성군', '김해시', '남해군', '밀양시', '사천시', '산청군', '양산시', '의령군', '진주시', '창녕군', '창원시', '통영시', '하동군', '함안군', '함양군', '합천군'],
    '제주특별자치도': ['서귀포시', '제주시']
};

// 초기화
function initializeLocationSelectors() {
    const citySelect = document.getElementById('citySelect');
    const districtSelect = document.getElementById('districtSelect');

    if (citySelect) {
        const provinces = Object.keys(LOCATION_DATA);
        citySelect.innerHTML = '<option value="">시/도 선택</option>' +
            provinces.map(province => `<option value="${province}">${province}</option>`).join('');

        // 시/도 변경 시 구/군 업데이트
        citySelect.addEventListener('change', function() {
            updateDistrictOptions(this.value);
        });
    }

    // 구/군 선택기 초기화
    if (districtSelect) {
        districtSelect.innerHTML = '<option value="">구/군 선택</option>';
    }
}

// 구/군 옵션 업데이트
function updateDistrictOptions(selectedProvince) {
    const districtSelect = document.getElementById('districtSelect');
    if (!districtSelect) return;

    if (!selectedProvince || !LOCATION_DATA[selectedProvince]) {
        districtSelect.innerHTML = '<option value="">구/군 선택</option>';
        return;
    }

    const districts = LOCATION_DATA[selectedProvince];
    districtSelect.innerHTML = '<option value="">구/군 선택</option>' +
        districts.map(district => `<option value="${district}">${district}</option>`).join('');
}

// 이벤트 리스너
document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard 초기화 시작');

    // 위치 선택기 초기화
    initializeLocationSelectors();

    // 검색 버튼 이벤트 (HTML의 onclick으로 처리됨)

    // Enter 키 검색
    const companyNameInput = document.getElementById('companyNameInput');
    if (companyNameInput) {
        companyNameInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchCompanies();
            }
        });
    }

    // 필터 변경 이벤트
    ['industrySelect', 'citySelect', 'districtSelect'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', function() {
                if (allCompanies.length > 0) {
                    applyFilters();
                    displayResults();
                    updateStats();
                }
            });
        }
    });

    // 모달 닫기 이벤트
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('companyDetailModal');
        if (event.target === modal) {
            closeModal();
        }
    });

    console.log('Dashboard 초기화 완료');
});

// 전역 함수로 노출
window.searchCompanies = searchCompanies;
window.showCompanyDetail = showCompanyDetail;
window.closeModal = closeModal;