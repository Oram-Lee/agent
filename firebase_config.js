// Firebase 설정 파일
// 실제 Firebase 프로젝트 생성 후 설정값 교체 필요

const firebaseConfig = {
    apiKey: "your-firebase-api-key",
    authDomain: "office-relocation-predictor.firebaseapp.com",
    projectId: "office-relocation-predictor",
    storageBucket: "office-relocation-predictor.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef123456789012"
};

// Firebase 초기화
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

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