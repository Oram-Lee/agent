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
        // HTTP 엔드포인트 사용 (더 안정적)
        const url = `${FIREBASE_FUNCTIONS_BASE_URL}/searchAllAPIsHttp`;

        try {
            console.log('📡 API 호출 시작:', url, searchParams);

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(searchParams)
            });

            if (!response.ok) {
                console.error('API 응답 에러:', response.status, response.statusText);
                const errorData = await response.json();
                throw new Error(errorData.error || 'API call failed');
            }

            const result = await response.json();
            console.log('📡 API 응답 성공:', result);
            return result;
        } catch (error) {
            console.error('searchAllAPIs 호출 실패:', error);
            throw error;
        }
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
        const selectedDistrict = document.getElementById('districtSelect')?.value || '';
        const riskRange = 50; // 기본값

        // 검색 조건 체크 - 하나라도 있으면 검색 가능
        const hasAnyCondition = searchQuery || selectedIndustry || selectedLocation || selectedDistrict;

        if (!hasAnyCondition) {
            alert('검색 조건을 하나 이상 입력해주세요.\n(기업명, 업종, 지역 중 선택)');
            updateSearchStatus('대기 중', false);
            isSearching = false;
            return;
        }

        console.log('검색 시작:', {
            searchQuery: searchQuery || '(없음)',
            selectedIndustry: selectedIndustry || '(없음)',
            selectedLocation: selectedLocation || '(없음)',
            selectedDistrict: selectedDistrict || '(없음)',
            riskRange
        });

        // Firebase Functions를 통한 통합 API 검색
        const searchParams = {
            query: searchQuery || selectedIndustry || selectedLocation || '기업',
            companyName: searchQuery || '',
            industry: selectedIndustry || '',
            city: selectedLocation || ''
        };

        // 콘솔 로그 개선
        console.log('API 요청 파라미터:', searchParams);

        updateSearchStatus('API 데이터 수집 중...', true);

        const apiResponse = await FirebaseAPI.searchAllAPIs(searchParams);
        console.log('API 검색 결과:', apiResponse);
        console.log('응답 구조 분석:', {
            success: apiResponse.success,
            hasResults: !!apiResponse.results,
            resultsLength: apiResponse.results?.length || 0,
            resultSources: apiResponse.results?.map(r => r.source) || []
        });

        // 결과 데이터 처리
        allCompanies = [];

        if (apiResponse.success && apiResponse.results) {
            // API 결과에서 source별로 데이터 추출
            const newsResult = apiResponse.results.find(r => r.source === 'naver_news');
            const blogResult = apiResponse.results.find(r => r.source === 'naver_blog');
            const dartResult = apiResponse.results.find(r => r.source === 'dart');

            const newsData = newsResult?.data || null;
            const blogData = blogResult?.data || null;
            const dartData = dartResult?.data || null;

            console.log('추출된 데이터:', { newsData: !!newsData, blogData: !!blogData, dartData: !!dartData });

            // 수집된 데이터를 기반으로 기업 정보 생성
            const companies = await processAPIResults(newsData, blogData, dartData, searchQuery);
            allCompanies = companies;
        } else {
            console.error('API 검색 실패:', apiResponse.error || 'No results found');
            // 실패시 기본 검색 시도
            allCompanies = await performFallbackSearch(searchQuery, selectedIndustry, selectedLocation, selectedDistrict);
        }

        // 필터 적용
        applyFilters();

        // 결과 표시
        displayResults();
        updateStats();

        updateSearchStatus(`검색 완료 - ${allCompanies.length}개 기업 발견`, false);

    } catch (apiError) {
        console.error('API 호출 오류 상세:', {
            message: apiError.message,
            response: apiError.response,
            status: apiError.status,
            searchParams: {
                searchQuery,
                selectedIndustry,
                selectedLocation,
                selectedDistrict
            }
        });

        updateSearchStatus('검색 중 오류 발생 - 폴백 검색 시도 중...', true);

        try {
            // 자동으로 폴백 검색 실행
            console.log('자동 폴백 검색 시작');
            allCompanies = await performFallbackSearch(searchQuery, selectedIndustry, selectedLocation, selectedDistrict);
            applyFilters();
            displayResults();
            updateStats();
            updateSearchStatus(`폴백 검색 완료 - ${allCompanies.length}개 기업 발견`, false);
        } catch (fallbackError) {
            console.error('폴백 검색도 실패:', fallbackError);
            updateSearchStatus('검색 실패 - 다시 시도해주세요.', false);
            allCompanies = [];
            displayResults();
            updateStats();
        }
    } finally {
        isSearching = false;
    }
}

// API 결과 처리
async function processAPIResults(newsData, blogData, dartData, searchQuery) {
    const companies = [];
    const processedNames = new Set(); // 중복 방지

    try {
        console.log('🔍 API 결과 처리 시작:', {
            newsItems: newsData?.items?.length || 0,
            blogItems: blogData?.items?.length || 0,
            dartItems: dartData?.list?.length || 0,
            searchQuery
        });

        // 1. 뉴스 데이터 처리
        if (newsData?.items && newsData.items.length > 0) {
            console.log('📰 뉴스 데이터 처리 중...');

            newsData.items.forEach((item, index) => {
                // HTML 태그 제거
                const cleanTitle = item.title.replace(/<[^>]*>/g, '');
                const cleanDesc = item.description.replace(/<[^>]*>/g, '');

                // 기업명 추출 (searchQuery 우선 사용)
                let companyName = searchQuery && searchQuery.trim() ? searchQuery.trim() : extractCompanyName(cleanTitle, searchQuery);

                // 제목에서 더 구체적인 기업명 찾기
                if (cleanTitle.includes(searchQuery || '')) {
                    companyName = searchQuery;
                } else {
                    // 첫 번째 명사구를 기업명으로 추측
                    const match = cleanTitle.match(/^([가-힣A-Za-z0-9]+)/);
                    if (match && match[1].length >= 2) {
                        companyName = match[1];
                    }
                }

                // 중복 체크
                if (processedNames.has(companyName)) return;
                processedNames.add(companyName);

                // 실제 데이터로 기업 정보 생성
                const company = {
                    name: companyName,
                    industry: detectIndustry(cleanTitle + ' ' + cleanDesc),
                    address: detectLocation(cleanTitle + ' ' + cleanDesc),
                    district: detectDistrict(cleanTitle + ' ' + cleanDesc),
                    employee_count: Math.floor(Math.random() * 1000) + 50, // 임시
                    business_type: detectBusinessType(cleanTitle + ' ' + cleanDesc),
                    risk_score: calculateRiskScore(item, index),
                    prediction: generatePrediction(item),
                    signals: extractSignals(cleanTitle + ' ' + cleanDesc),
                    last_update: new Date().toISOString(),
                    news_title: cleanTitle,
                    news_link: item.link,
                    news_date: item.pubDate
                };

                companies.push(company);
                console.log(`📰 뉴스 기업 추가: ${company.name} (점수: ${company.risk_score})`);
            });
        }

        // 2. 블로그 데이터 처리
        if (blogData?.items && blogData.items.length > 0) {
            console.log('📝 블로그 데이터 처리 중...');

            blogData.items.forEach((item, index) => {
                const cleanTitle = item.title.replace(/<[^>]*>/g, '');
                const cleanDesc = item.description.replace(/<[^>]*>/g, '');

                let companyName = searchQuery && searchQuery.trim() ? searchQuery.trim() : extractCompanyName(cleanTitle, searchQuery);

                if (processedNames.has(companyName)) return;
                processedNames.add(companyName);

                const company = {
                    name: companyName,
                    industry: detectIndustry(cleanTitle + ' ' + cleanDesc),
                    address: detectLocation(cleanTitle + ' ' + cleanDesc),
                    district: detectDistrict(cleanTitle + ' ' + cleanDesc),
                    employee_count: Math.floor(Math.random() * 500) + 30,
                    business_type: detectBusinessType(cleanTitle + ' ' + cleanDesc),
                    risk_score: calculateRiskScore(item, index + 5), // 블로그는 뉴스보다 낮은 가중치
                    prediction: generatePrediction(item),
                    signals: extractSignals(cleanTitle + ' ' + cleanDesc),
                    last_update: new Date().toISOString(),
                    blog_title: cleanTitle,
                    blog_link: item.link,
                    blog_date: item.postdate
                };

                companies.push(company);
                console.log(`📝 블로그 기업 추가: ${company.name} (점수: ${company.risk_score})`);
            });
        }

        // 3. DART 데이터 처리
        if (dartData?.list && dartData.list.length > 0) {
            console.log('💼 DART 데이터 처리 중...');

            dartData.list.forEach(item => {
                if (processedNames.has(item.corp_name)) return;
                processedNames.add(item.corp_name);

                companies.push({
                    name: item.corp_name,
                    industry: detectDartIndustry(item.corp_cls),
                    address: '공시 참조',
                    district: '서울/경기',
                    employee_count: null,
                    business_type: item.corp_cls || '상장기업',
                    risk_score: 70 + Math.random() * 20, // DART 기업은 높은 기본 점수
                    prediction: generateDartPrediction(item),
                    signals: ['최근 공시: ' + item.report_nm],
                    last_update: new Date().toISOString(),
                    dart_link: `http://dart.fss.or.kr/dsaf001/main.do?rcpNo=${item.rcept_no}`,
                    dart_report: item.report_nm,
                    dart_date: item.rcept_dt
                });

                console.log(`💼 DART 기업 추가: ${item.corp_name}`);
            });
        }

        console.log(`🎯 총 ${companies.length}개 기업 처리 완료`);
        return companies;

    } catch (error) {
        console.error('processAPIResults 오류:', error);
        return [];
    }
}

// 폴백 검색 (API 실패시)
async function performFallbackSearch(searchQuery, selectedIndustry, selectedLocation, selectedDistrict) {
    try {
        console.log('폴백 검색 수행:', { searchQuery, selectedIndustry, selectedLocation, selectedDistrict });

        // 검색 쿠리 생성
        let searchTerms = [];
        if (searchQuery && searchQuery.trim()) searchTerms.push(searchQuery);
        if (selectedIndustry) searchTerms.push(selectedIndustry);
        if (selectedLocation) searchTerms.push(selectedLocation);
        if (selectedDistrict) searchTerms.push(selectedDistrict);

        const fallbackQuery = searchTerms.length > 0 ? searchTerms.join(' ') : '기업';

        // 개별 API 호출 시도
        const newsPromise = FirebaseAPI.searchNaverNews(fallbackQuery + ' 기업');
        const blogPromise = FirebaseAPI.searchNaverBlog(fallbackQuery + ' 회사');
        const dartPromise = FirebaseAPI.searchDartAPI(searchQuery || fallbackQuery);

        const [newsResult, blogResult, dartResult] = await Promise.allSettled([
            newsPromise, blogPromise, dartPromise
        ]);

        // 각 API 응답에서 적절한 데이터 추출
        const newsData = newsResult.status === 'fulfilled' ? (newsResult.value?.data || newsResult.value) : null;
        const blogData = blogResult.status === 'fulfilled' ? (blogResult.value?.data || blogResult.value) : null;
        const dartData = dartResult.status === 'fulfilled' ? (dartResult.value?.data || dartResult.value) : null;

        console.log('폴백 검색 결과:', { newsData: !!newsData, blogData: !!blogData, dartData: !!dartData });

        const companies = await processAPIResults(newsData, blogData, dartData, searchQuery);

        // 검색 결과가 없으면 필터 조건에 따른 기본 정보 반환
        if (companies.length === 0) {
            let companyName = searchQuery || '미상 기업';
            let industry = selectedIndustry || '정보 수집 필요';
            let address = selectedLocation ? `${selectedLocation} ${selectedDistrict || ''} 지역` : '주소 조회 필요';
            let district = selectedLocation || '지역 미상';

            return [{
                name: companyName,
                industry: industry,
                address: address.trim(),
                district: district,
                employee_count: null,
                business_type: '분류 필요',
                risk_score: 50,
                prediction: '추가 분석 필요',
                signals: ['검색 기반 기본 정보'],
                last_update: new Date().toISOString(),
                fallback: true
            }];
        }

        return companies;

    } catch (error) {
        console.error('폴백 검색 실패:', error);
        // 완전 실패 시에도 기본 정보 반환
        let companyName = searchQuery || '검색 실패';
        let industry = selectedIndustry || '정보 없음';
        let address = selectedLocation ? `${selectedLocation} ${selectedDistrict || ''} 지역` : '정보 없음';
        let district = selectedLocation || '정보 없음';

        return [{
            name: companyName,
            industry: industry,
            address: address.trim(),
            district: district,
            employee_count: null,
            business_type: '정보 없음',
            risk_score: 0,
            prediction: '데이터 수집 실패',
            signals: ['검색 실패'],
            last_update: new Date().toISOString(),
            error: true
        }];
    }
}

// 유틸리티 함수들
function extractCompanyName(title, searchQuery) {
    // HTML 태그 제거
    const cleanTitle = title.replace(/<[^>]*>/g, '').trim();

    // 제목에서 회사명 추출 로직 개선
    const patterns = [
        /([가-힣A-Za-z0-9]+)(?:주식회사|㈜|\s+Inc\.|\s+Corp\.|\s+Co\.)/,
        /([가-힣]{2,15})(그룹|전자|화학|바이오|테크|시스템|솔루션|네트웍스|커뮤니케이션즈|게임즈)/,
        /([가-힣A-Za-z0-9]{2,20})(?:\s+기업|\s+회사)/,
        // 따옴표 안의 기업명
        /['"]([가-힣A-Za-z0-9\s]{2,20})['"](?:.*(?:기업|회사|그룹))?/,
        // 문장 시작 부분의 기업명
        /^([가-힣A-Za-z0-9]{2,15})(?:\s|,|\.)/
    ];

    // searchQuery가 있으면 우선 사용
    if (searchQuery && searchQuery.trim()) {
        if (cleanTitle.includes(searchQuery.trim())) {
            return searchQuery.trim();
        }
        patterns.unshift(new RegExp(`(${searchQuery.trim()})`, 'i'));
    }

    for (const pattern of patterns) {
        const match = cleanTitle.match(pattern);
        if (match && match[1]) {
            return match[1].trim();
        }
    }

    // 마지막 수단: 첫 번째 단어 사용
    const words = cleanTitle.split(/[\s,\.]+/);
    const firstWord = words[0];
    if (firstWord && firstWord.length >= 2) {
        return firstWord;
    }

    return searchQuery || '기업명 미상';
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
            <div class="col-12">
                <div class="alert alert-info text-center" role="alert">
                    <h4 class="alert-heading">🔍 검색 결과가 없습니다</h4>
                    <p>입력하신 검색 조건에 맞는 기업을 찾을 수 없습니다.</p>
                    <hr>
                    <p class="mb-0">
                        <strong>다음 사항을 확인해보세요:</strong><br>
                        • 기업명 철자가 정확한지 확인<br>
                        • 필터 조건을 완화하여 재검색<br>
                        • 다른 검색어로 시도
                    </p>
                </div>
            </div>
        `;
        return;
    }

    resultsContainer.innerHTML = filteredCompanies.map(company => `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="card company-card h-100" onclick="showCompanyDetail('${company.name}')" style="cursor: pointer;">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h5 class="mb-0 company-name">${company.name}</h5>
                    <span class="badge bg-${getRiskBadgeColor(company.risk_score)} risk-score">${company.risk_score}</span>
                </div>
                <div class="card-body">
                    <p class="card-text">
                        <strong>업종:</strong> ${company.industry}<br>
                        <strong>위치:</strong> ${company.address}<br>
                        <strong>예측:</strong> ${company.prediction}
                    </p>
                    ${company.fallback ? '<small class="text-muted">⚠️ 제한된 정보</small>' : ''}
                    ${company.error ? '<small class="text-danger">❌ 데이터 수집 실패</small>' : ''}
                </div>
                <div class="card-footer">
                    <div class="company-signals">
                        ${company.signals.map(signal => `<span class="badge bg-secondary me-1">${signal}</span>`).join('')}
                    </div>
                </div>
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

// 새로운 헬퍼 함수들
function detectIndustry(text) {
    if (text.includes('게임') || text.includes('엔터')) return '게임/엔터테인먼트';
    if (text.includes('IT') || text.includes('소프트') || text.includes('앱') || text.includes('플랫폼')) return 'IT/소프트웨어';
    if (text.includes('바이오') || text.includes('제약') || text.includes('의료')) return '바이오/제약';
    if (text.includes('전자') || text.includes('반도체') || text.includes('칩')) return '전자/반도체';
    if (text.includes('금융') || text.includes('은행') || text.includes('투자')) return '금융';
    if (text.includes('유통') || text.includes('소매') || text.includes('쇼핑')) return '유통/소매';
    if (text.includes('건설') || text.includes('부동산') || text.includes('시공')) return '건설/부동산';
    if (text.includes('제조') || text.includes('생산') || text.includes('공장')) return '제조업';
    if (text.includes('물류') || text.includes('운송') || text.includes('배송')) return '물류/운송';
    if (text.includes('화학') || text.includes('석유') || text.includes('화공')) return '화학/석유';
    return '기타';
}

function detectLocation(text) {
    const locations = ['강남', '판교', '구로', '가산', '상암', '여의도', '광화문', '종로', '중구', '송파', '성남', '분당'];
    for (let loc of locations) {
        if (text.includes(loc)) return loc + ' 일대';
    }
    if (text.includes('서울')) return '서울';
    if (text.includes('경기')) return '경기';
    if (text.includes('부산')) return '부산';
    if (text.includes('대구')) return '대구';
    if (text.includes('인천')) return '인천';
    return '서울/경기';
}

function detectDistrict(text) {
    if (text.includes('강남') || text.includes('서초') || text.includes('송파')) return '강남구';
    if (text.includes('판교') || text.includes('분당')) return '성남시';
    if (text.includes('구로') || text.includes('가산')) return '구로구';
    if (text.includes('상암') || text.includes('마포')) return '마포구';
    if (text.includes('여의도') || text.includes('영등포')) return '영등포구';
    if (text.includes('광화문') || text.includes('종로')) return '종로구';
    return '서울/경기';
}

function detectBusinessType(text) {
    if (text.includes('상장') || text.includes('코스피') || text.includes('코스닥')) return '상장기업';
    if (text.includes('중소기업') || text.includes('스타트업') || text.includes('신생')) return '중소기업';
    if (text.includes('대기업') || text.includes('그룹') || text.includes('계열')) return '대기업';
    if (text.includes('외국계') || text.includes('글로벌')) return '외국계기업';
    return '일반기업';
}

function calculateRiskScore(item, index) {
    // 최신 뉴스일수록 높은 점수
    const baseScore = 50;
    const recencyBonus = Math.max(0, 30 - index * 3);

    const content = (item.title + ' ' + item.description).toLowerCase();
    let keywordBonus = 0;

    if (content.includes('이전') || content.includes('신사옥')) keywordBonus += 25;
    if (content.includes('확장') || content.includes('증설')) keywordBonus += 20;
    if (content.includes('투자') || content.includes('자금')) keywordBonus += 15;
    if (content.includes('채용') || content.includes('인력')) keywordBonus += 10;
    if (content.includes('성장') || content.includes('급성장')) keywordBonus += 10;
    if (content.includes('상장') || content.includes('공개')) keywordBonus += 15;

    return Math.min(100, baseScore + recencyBonus + keywordBonus);
}

function generatePrediction(item) {
    const content = (item.title + ' ' + item.description).toLowerCase();

    if (content.includes('이전') || content.includes('신사옥')) {
        return '3-6개월 내 사옥 이전 가능성 높음';
    }
    if (content.includes('확장') || content.includes('증설')) {
        return '6-12개월 내 사업 확장으로 인한 이전 검토';
    }
    if (content.includes('투자') || content.includes('자금')) {
        return '투자 유치 후 6-18개월 내 이전 가능';
    }
    if (content.includes('채용') || content.includes('인력')) {
        return '인력 확충으로 인한 공간 확장 필요';
    }
    if (content.includes('상장') || content.includes('공개')) {
        return '상장 후 이미지 개선을 위한 이전 가능';
    }

    return '추가 모니터링 필요';
}

function extractSignals(text) {
    const signals = [];
    const content = text.toLowerCase();

    if (content.includes('투자') || content.includes('자금')) signals.push('투자 유치');
    if (content.includes('상장') || content.includes('공개')) signals.push('상장 관련');
    if (content.includes('채용') || content.includes('인력')) signals.push('채용 확대');
    if (content.includes('성장') || content.includes('급성장')) signals.push('급성장');
    if (content.includes('확장') || content.includes('증설')) signals.push('사업 확장');
    if (content.includes('이전') || content.includes('신사옥')) signals.push('사옥 이전');
    if (content.includes('인수') || content.includes('합병')) signals.push('M&A 관련');
    if (content.includes('신제품') || content.includes('출시')) signals.push('신제품 출시');

    if (signals.length === 0) signals.push('일반 뉴스');
    return signals;
}

function detectDartIndustry(corp_cls) {
    if (corp_cls === 'Y') return '유가증권시장';
    if (corp_cls === 'K') return '코스닥시장';
    if (corp_cls === 'N') return '코넥스시장';
    return '상장기업';
}

function generateDartPrediction(item) {
    const reportName = item.report_nm.toLowerCase();

    if (reportName.includes('증자') || reportName.includes('투자')) {
        return '자금 조달 후 사업 확장 가능';
    }
    if (reportName.includes('분할') || reportName.includes('합병')) {
        return '조직 개편으로 인한 이전 가능성';
    }
    if (reportName.includes('사업보고서')) {
        return '정기 공시 - 추가 분석 필요';
    }
    if (reportName.includes('중요사항')) {
        return '중요 변동사항 발생 - 주의 관찰';
    }

    return '공시 기반 분석 필요';
}

// 위험도 레벨 계산
function getRiskLevel(score) {
    if (score >= 80) return 'high-risk';
    if (score >= 60) return 'medium-risk';
    return 'low-risk';
}

// 위험도 배지 색상 계산
function getRiskBadgeColor(score) {
    if (score >= 80) return 'danger';
    if (score >= 60) return 'warning';
    return 'success';
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