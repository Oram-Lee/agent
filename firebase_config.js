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

// Firebase 초기화 (Functions만)
firebase.initializeApp(firebaseConfig);

console.log('🔥 Firebase 초기화 완료');
console.log('📊 프로젝트 ID:', firebaseConfig.projectId);

// Firebase Functions URL 전역 설정
window.FIREBASE_FUNCTIONS_BASE_URL = 'https://us-central1-office-relocation-predic-df116.cloudfunctions.net';

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