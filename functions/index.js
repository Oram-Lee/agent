const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
const cors = require('cors')({origin: true});
const https = require('https');

// HTTPS agent that ignores SSL certificate errors for development
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

// Firebase Admin 초기화
admin.initializeApp();

// API 키 설정
const API_KEYS = {
    naver_client_id: 'MRrqB4usbuuk9uuXzZDM',
    naver_client_secret: 'Yoionk4bGp',
    naver_blog_client_id: '7kbgK3Fi__DX0_cnJOEp',
    naver_blog_client_secret: 'QyfsHO2dIk',
    google_api_key: 'AIzaSyBNDjMJqJnzpJKc3Hnfq2yh40UTkWPFmJU',
    google_search_engine_id: '0623a984354754d30',
    dart_api_key: '416dbd4f88fd71c98204eec5b5502a4daf8045cd'
};

// API 엔드포인트
const API_ENDPOINTS = {
    naver_news: 'https://openapi.naver.com/v1/search/news.json',
    naver_blog: 'https://openapi.naver.com/v1/search/blog.json',
    google_search: 'https://www.googleapis.com/customsearch/v1',
    dart_list: 'https://opendart.fss.or.kr/api/list.json'
};

// 네이버 뉴스 검색 API 프록시
exports.searchNaverNews = functions.https.onCall(async (data, context) => {
    console.log('📰 네이버 뉴스 API 호출 시작:', data);

    try {
        const { query, display = 50, start = 1, sort = 'date' } = data;

        // 빈 값도 허용하되 기본값 사용
        const searchQuery = query || '기업 사옥';

        const response = await axios.get(API_ENDPOINTS.naver_news, {
            httpsAgent: httpsAgent,
            headers: {
                'X-Naver-Client-Id': API_KEYS.naver_client_id,
                'X-Naver-Client-Secret': API_KEYS.naver_client_secret,
                'User-Agent': 'Mozilla/5.0 (compatible; Firebase Functions)'
            },
            params: {
                query: searchQuery,
                display,
                start,
                sort
            },
            timeout: 10000
        });

        console.log('✅ 네이버 뉴스 API 성공:', response.data.items?.length || 0, '개 결과');

        return {
            success: true,
            data: response.data,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error('❌ 네이버 뉴스 API 오류:', error.message);

        if (error.response) {
            console.error('API 응답 오류:', error.response.status, error.response.data);
        }

        throw new functions.https.HttpsError(
            'internal',
            `Naver News API error: ${error.message}`,
            { originalError: error.response?.data }
        );
    }
});

// 네이버 블로그 검색 API 프록시
exports.searchNaverBlog = functions.https.onCall(async (data, context) => {
    console.log('📝 네이버 블로그 API 호출 시작:', data);

    try {
        const { query, display = 30, start = 1, sort = 'date' } = data;

        // 빈 값도 허용하되 기본값 사용
        const searchQuery = query || '기업 사옥';

        const response = await axios.get(API_ENDPOINTS.naver_blog, {
            httpsAgent: httpsAgent,
            headers: {
                'X-Naver-Client-Id': API_KEYS.naver_blog_client_id,
                'X-Naver-Client-Secret': API_KEYS.naver_blog_client_secret,
                'User-Agent': 'Mozilla/5.0 (compatible; Firebase Functions)'
            },
            params: {
                query: searchQuery,
                display,
                start,
                sort
            },
            timeout: 10000
        });

        console.log('✅ 네이버 블로그 API 성공:', response.data.items?.length || 0, '개 결과');

        return {
            success: true,
            data: response.data,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error('❌ 네이버 블로그 API 오류:', error.message);

        throw new functions.https.HttpsError(
            'internal',
            `Naver Blog API error: ${error.message}`,
            { originalError: error.response?.data }
        );
    }
});

// DART 공시정보 API 프록시
exports.searchDartAPI = functions.https.onCall(async (data, context) => {
    console.log('📊 DART API 호출 시작:', data);

    try {
        const {
            corp_name,
            bgn_de = '20231201',
            end_de = '20241201',
            page_no = 1,
            page_count = 10
        } = data;

        if (!corp_name) {
            throw new functions.https.HttpsError('invalid-argument', 'corp_name parameter is required');
        }

        const response = await axios.get(API_ENDPOINTS.dart_list, {
            httpsAgent: httpsAgent,
            params: {
                crtfc_key: API_KEYS.dart_api_key,
                corp_name,
                bgn_de,
                end_de,
                page_no,
                page_count
            },
            timeout: 15000
        });

        console.log('📊 DART API 응답:', response.data.status, response.data.message);

        if (response.data.status === '000') {
            console.log('✅ DART API 성공:', response.data.list?.length || 0, '개 공시');

            return {
                success: true,
                data: response.data,
                timestamp: new Date().toISOString()
            };
        } else {
            console.warn('⚠️ DART API 경고:', response.data.status, response.data.message);

            return {
                success: false,
                data: response.data,
                message: response.data.message || 'DART API returned non-success status',
                timestamp: new Date().toISOString()
            };
        }

    } catch (error) {
        console.error('❌ DART API 오류:', error.message);

        throw new functions.https.HttpsError(
            'internal',
            `DART API error: ${error.message}`,
            { originalError: error.response?.data }
        );
    }
});

// 통합 기업 검색 함수 (모든 API를 병렬로 호출)
exports.searchAllAPIs = functions.https.onCall(async (data, context) => {
    console.log('🔍 통합 API 검색 시작:', data);

    try {
        const { query, companyName, industry, city } = data;

        // 검색 쿼리 구성
        const searchQuery = buildSearchQuery(query, companyName, industry, city);
        console.log('🔍 최종 검색 쿼리:', searchQuery);

        // 모든 API를 병렬로 호출
        const promises = [];

        // 1. 네이버 뉴스 검색
        promises.push(
            searchNaverNewsInternal(searchQuery).catch(error => {
                console.error('네이버 뉴스 검색 실패:', error.message);
                return { source: 'naver_news', success: false, error: error.message };
            })
        );

        // 2. 네이버 블로그 검색
        promises.push(
            searchNaverBlogInternal(searchQuery).catch(error => {
                console.error('네이버 블로그 검색 실패:', error.message);
                return { source: 'naver_blog', success: false, error: error.message };
            })
        );

        // 3. DART 검색 (기업명이 있는 경우)
        if (companyName) {
            promises.push(
                searchDartInternal(companyName).catch(error => {
                    console.error('DART 검색 실패:', error.message);
                    return { source: 'dart', success: false, error: error.message };
                })
            );
        }

        const results = await Promise.allSettled(promises);

        // 결과 정리
        const apiResults = results.map((result, index) => {
            if (result.status === 'fulfilled') {
                return result.value;
            } else {
                return {
                    success: false,
                    error: result.reason.message,
                    source: ['naver_news', 'naver_blog', 'dart'][index]
                };
            }
        });

        console.log('📊 통합 검색 완료:', apiResults.length, '개 API 결과');

        return {
            success: true,
            results: apiResults,
            query: searchQuery,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error('❌ 통합 API 검색 오류:', error.message);

        throw new functions.https.HttpsError(
            'internal',
            `Integrated search error: ${error.message}`
        );
    }
});

// 내부 검색 함수들
async function searchNaverNewsInternal(query) {
    const response = await axios.get(API_ENDPOINTS.naver_news, {
        httpsAgent: httpsAgent,
        headers: {
            'X-Naver-Client-Id': API_KEYS.naver_client_id,
            'X-Naver-Client-Secret': API_KEYS.naver_client_secret
        },
        params: { query, display: 50, start: 1, sort: 'date' },
        timeout: 10000
    });

    return {
        source: 'naver_news',
        success: true,
        data: response.data,
        count: response.data.items?.length || 0
    };
}

async function searchNaverBlogInternal(query) {
    const response = await axios.get(API_ENDPOINTS.naver_blog, {
        httpsAgent: httpsAgent,
        headers: {
            'X-Naver-Client-Id': API_KEYS.naver_blog_client_id,
            'X-Naver-Client-Secret': API_KEYS.naver_blog_client_secret
        },
        params: { query, display: 30, start: 1, sort: 'date' },
        timeout: 10000
    });

    return {
        source: 'naver_blog',
        success: true,
        data: response.data,
        count: response.data.items?.length || 0
    };
}

async function searchDartInternal(corpName) {
    const response = await axios.get(API_ENDPOINTS.dart_list, {
        httpsAgent: httpsAgent,
        params: {
            crtfc_key: API_KEYS.dart_api_key,
            corp_name: corpName,
            bgn_de: '20231201',
            end_de: '20241201',
            page_no: 1,
            page_count: 10
        },
        timeout: 15000
    });

    return {
        source: 'dart',
        success: response.data.status === '000',
        data: response.data,
        count: response.data.list?.length || 0
    };
}

// 검색 쿼리 생성 도우미 함수
function buildSearchQuery(query, companyName, industry, city) {
    let searchTerms = [];

    if (query) searchTerms.push(query);
    if (companyName) searchTerms.push(companyName);
    if (industry) searchTerms.push(industry);
    if (city) searchTerms.push(city);

    // 아무 조건도 없으면 기본 검색어 사용
    if (searchTerms.length === 0) {
        searchTerms.push('기업', '회사');
    }

    // 기본 키워드 추가
    searchTerms.push('사옥', '이전', '확장');

    return searchTerms.join(' ');
}

// 헬스 체크 함수
exports.healthCheck = functions.https.onRequest((req, res) => {
    cors(req, res, () => {
        const healthInfo = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            apis: {
                naver: !!API_KEYS.naver_client_id,
                dart: !!API_KEYS.dart_api_key,
                google: !!API_KEYS.google_api_key
            }
        };

        res.status(200).json(healthInfo);
    });
});

// API 키 테스트 함수 (개발용)
exports.testAPIs = functions.https.onCall(async (data, context) => {
    console.log('🧪 API 연결 테스트 시작');

    const results = {
        naver_news: false,
        naver_blog: false,
        dart: false,
        timestamp: new Date().toISOString()
    };

    // 네이버 뉴스 테스트
    try {
        await axios.get(API_ENDPOINTS.naver_news, {
            httpsAgent: httpsAgent,
            headers: {
                'X-Naver-Client-Id': API_KEYS.naver_client_id,
                'X-Naver-Client-Secret': API_KEYS.naver_client_secret
            },
            params: { query: '테스트', display: 1 },
            timeout: 5000
        });
        results.naver_news = true;
        console.log('✅ 네이버 뉴스 API 연결 성공');
    } catch (error) {
        console.error('❌ 네이버 뉴스 API 연결 실패:', error.message);
    }

    // 네이버 블로그 테스트
    try {
        await axios.get(API_ENDPOINTS.naver_blog, {
            httpsAgent: httpsAgent,
            headers: {
                'X-Naver-Client-Id': API_KEYS.naver_blog_client_id,
                'X-Naver-Client-Secret': API_KEYS.naver_blog_client_secret
            },
            params: { query: '테스트', display: 1 },
            timeout: 5000
        });
        results.naver_blog = true;
        console.log('✅ 네이버 블로그 API 연결 성공');
    } catch (error) {
        console.error('❌ 네이버 블로그 API 연결 실패:', error.message);
    }

    // DART 테스트
    try {
        const response = await axios.get(API_ENDPOINTS.dart_list, {
            httpsAgent: httpsAgent,
            params: {
                crtfc_key: API_KEYS.dart_api_key,
                corp_name: '삼성전자',
                bgn_de: '20241201',
                end_de: '20241201',
                page_count: 1
            },
            timeout: 5000
        });
        results.dart = response.data.status === '000';
        console.log('✅ DART API 연결 성공');
    } catch (error) {
        console.error('❌ DART API 연결 실패:', error.message);
    }

    console.log('🧪 API 테스트 완료:', results);
    return results;
});

// === HTTP 엔드포인트 (CORS 지원) ===

// 네이버 뉴스 검색 HTTP 엔드포인트
exports.searchNaverNewsHttp = functions.https.onRequest(async (req, res) => {
    return cors(req, res, async () => {
        try {
            console.log('📰 네이버 뉴스 HTTP API 호출:', req.body || req.query);

            const { query, display = 50, start = 1, sort = 'date' } = req.method === 'POST' ? req.body : req.query;

            // 빈 값도 허용하되 기본값 사용
            const searchQuery = query || '기업 사옥';

            const response = await axios.get(API_ENDPOINTS.naver_news, {
                httpsAgent: httpsAgent,
                headers: {
                    'X-Naver-Client-Id': API_KEYS.naver_client_id,
                    'X-Naver-Client-Secret': API_KEYS.naver_client_secret,
                    'User-Agent': 'Mozilla/5.0 (compatible; Firebase Functions)'
                },
                params: { query: searchQuery, display, start, sort },
                timeout: 10000
            });

            res.json({
                success: true,
                data: response.data,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('❌ 네이버 뉴스 HTTP API 오류:', error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });
});

// 네이버 블로그 검색 HTTP 엔드포인트
exports.searchNaverBlogHttp = functions.https.onRequest(async (req, res) => {
    return cors(req, res, async () => {
        try {
            console.log('📝 네이버 블로그 HTTP API 호출:', req.body || req.query);

            const { query, display = 30, start = 1, sort = 'date' } = req.method === 'POST' ? req.body : req.query;

            // 빈 값도 허용하되 기본값 사용
            const searchQuery = query || '기업 사옥';

            const response = await axios.get(API_ENDPOINTS.naver_blog, {
                httpsAgent: httpsAgent,
                headers: {
                    'X-Naver-Client-Id': API_KEYS.naver_blog_client_id,
                    'X-Naver-Client-Secret': API_KEYS.naver_blog_client_secret,
                    'User-Agent': 'Mozilla/5.0 (compatible; Firebase Functions)'
                },
                params: { query: searchQuery, display, start, sort },
                timeout: 10000
            });

            res.json({
                success: true,
                data: response.data,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('❌ 네이버 블로그 HTTP API 오류:', error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });
});

// DART API HTTP 엔드포인트
exports.searchDartAPIHttp = functions.https.onRequest(async (req, res) => {
    return cors(req, res, async () => {
        try {
            console.log('📊 DART HTTP API 호출:', req.body || req.query);

            const {
                corp_name,
                bgn_de = '20231201',
                end_de = '20241201',
                page_no = 1,
                page_count = 10
            } = req.method === 'POST' ? req.body : req.query;

            if (!corp_name) {
                return res.status(400).json({
                    success: false,
                    error: 'corp_name parameter is required'
                });
            }

            const response = await axios.get(API_ENDPOINTS.dart_list, {
                httpsAgent: httpsAgent,
                params: {
                    crtfc_key: API_KEYS.dart_api_key,
                    corp_name,
                    bgn_de,
                    end_de,
                    page_no,
                    page_count
                },
                timeout: 15000
            });

            if (response.data.status === '000') {
                res.json({
                    success: true,
                    data: response.data,
                    timestamp: new Date().toISOString()
                });
            } else {
                res.json({
                    success: false,
                    data: response.data,
                    message: response.data.message || 'DART API returned non-success status',
                    timestamp: new Date().toISOString()
                });
            }

        } catch (error) {
            console.error('❌ DART HTTP API 오류:', error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });
});