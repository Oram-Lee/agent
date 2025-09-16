// Firebase 설정 및 초기화
const firebaseConfig = {
    apiKey: "AIzaSyC34jmKNk9KCRhb6d3mSQMdXNGUnZQdUPs",
    authDomain: "office-relocation-predic-df116.firebaseapp.com",
    projectId: "office-relocation-predic-df116",
    storageBucket: "office-relocation-predic-df116.firebasestorage.app",
    messagingSenderId: "667525962772",
    appId: "1:667525962772:web:4e4d859a5840de06629b01",
    measurementId: "G-JGVXRWSXBN"
};

// Firebase 초기화
firebase.initializeApp(firebaseConfig);

// Analytics 초기화 (선택적)
if (typeof firebase.analytics === 'function') {
    firebase.analytics();
}

console.log('🔥 Firebase 초기화 완료');
console.log('📊 프로젝트 ID:', firebaseConfig.projectId);

// Firebase Functions 인스턴스 생성
const functions = firebase.functions();

// 개발 환경에서는 로컬 에뮬레이터 사용
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('🔧 로컬 개발 환경 - Firebase 에뮬레이터 연결');
    functions.connectFunctionsEmulator('localhost', 5002);
}

// API 호출을 위한 Firebase Functions 래퍼
const FirebaseAPI = {
    // 네이버 뉴스 검색
    searchNaverNews: async (query, options = {}) => {
        console.log('📰 Firebase Function 호출: searchNaverNews', { query, options });

        try {
            const searchNaverNews = functions.httpsCallable('searchNaverNews');
            const result = await searchNaverNews({
                query,
                display: options.display || 50,
                start: options.start || 1,
                sort: options.sort || 'date'
            });

            console.log('✅ 네이버 뉴스 검색 성공:', result.data);
            return result.data;

        } catch (error) {
            console.error('❌ 네이버 뉴스 검색 실패:', error);
            throw error;
        }
    },

    // 네이버 블로그 검색
    searchNaverBlog: async (query, options = {}) => {
        console.log('📝 Firebase Function 호출: searchNaverBlog', { query, options });

        try {
            const searchNaverBlog = functions.httpsCallable('searchNaverBlog');
            const result = await searchNaverBlog({
                query,
                display: options.display || 30,
                start: options.start || 1,
                sort: options.sort || 'date'
            });

            console.log('✅ 네이버 블로그 검색 성공:', result.data);
            return result.data;

        } catch (error) {
            console.error('❌ 네이버 블로그 검색 실패:', error);
            throw error;
        }
    },

    // DART 공시정보 검색
    searchDartAPI: async (corpName, options = {}) => {
        console.log('📊 Firebase Function 호출: searchDartAPI', { corpName, options });

        try {
            const searchDartAPI = functions.httpsCallable('searchDartAPI');
            const result = await searchDartAPI({
                corp_name: corpName,
                bgn_de: options.beginDate || '20231201',
                end_de: options.endDate || '20241201',
                page_no: options.pageNo || 1,
                page_count: options.pageCount || 10
            });

            console.log('✅ DART API 검색 성공:', result.data);
            return result.data;

        } catch (error) {
            console.error('❌ DART API 검색 실패:', error);
            throw error;
        }
    },

    // 통합 API 검색 (모든 API 병렬 호출)
    searchAllAPIs: async (searchParams) => {
        console.log('🔍 Firebase Function 호출: searchAllAPIs', searchParams);

        try {
            const searchAllAPIs = functions.httpsCallable('searchAllAPIs');
            const result = await searchAllAPIs(searchParams);

            console.log('✅ 통합 API 검색 성공:', result.data);
            return result.data;

        } catch (error) {
            console.error('❌ 통합 API 검색 실패:', error);
            throw error;
        }
    },

    // API 연결 테스트
    testAPIs: async () => {
        console.log('🧪 Firebase Function 호출: testAPIs');

        try {
            const testAPIs = functions.httpsCallable('testAPIs');
            const result = await testAPIs();

            console.log('✅ API 테스트 완료:', result.data);
            return result.data;

        } catch (error) {
            console.error('❌ API 테스트 실패:', error);
            throw error;
        }
    }
};

// 전역으로 내보내기
window.FirebaseAPI = FirebaseAPI;

// Firestore 데이터 구조
/*
컬렉션: companies
문서 구조:
{
    id: "company-id",
    name: "회사명",
    industry: "업종",
    riskScore: 85,
    lastUpdate: timestamp,
    predictedDate: "2024-Q3",
    signals: ["투자 유치", "채용 확대"],
    newsData: [...],
    dartData: {...},
    investmentData: {...},
    prediction: {
        timeframe: "3-6개월 내",
        confidence: "높음",
        factors: [...]
    }
}

컬렉션: monitoring
문서 구조:
{
    timestamp: timestamp,
    collectionStatus: "running|completed|error",
    totalCompanies: 100,
    analyzedCompanies: 85,
    highRiskCount: 12,
    progressPercentage: 85
}
*/