# 🏢 기업 사옥 이전 예측 에이전트

AI 기반 기업 사옥 이전 수요 예측 시스템

## 📋 프로젝트 개요

다양한 데이터 소스를 활용하여 기업의 사옥 이전 가능성을 미리 예측하는 지능형 시스템입니다.

## 🔍 주요 기능

### 데이터 수집
- **뉴스 분석**: 네이버 검색 API, 구글 Custom Search API
- **공시 정보**: DART API를 통한 기업 공시 모니터링
- **투자 정보**: theVC, 크런치베이스 등 웹 스크래핑
- **부동산 정보**: 네이버 블로그 API, 카카오맵 API
- **문서 분석**: 네이버 클로바 OCR

### 예측 알고리즘
- 뉴스 기사에서 계약 기간 자동 추출
- 임대차 계약 만료 시점 계산 (기본 5년 주기)
- 투자 유치, 조직 확장 등 성장 지표 분석
- 종합 위험도 점수 산출

### 실시간 대시보드
- GitHub Pages 기반 웹 대시보드
- Firebase 실시간 데이터베이스 연동
- 수집 진행률 및 분석 현황 모니터링
- 가망 고객 리스트 및 예측 결과 시각화

## 🛠 기술 스택

- **Frontend**: HTML5, CSS3, JavaScript, Bootstrap 5, Chart.js
- **Backend**: Python (데이터 수집), Firebase Functions
- **Database**: Firebase Firestore
- **Hosting**: GitHub Pages
- **APIs**: 네이버, 구글, DART, 카카오맵

## 📊 데이터 소스

### API 기반
- 네이버 검색 API
- 네이버 블로그 API  
- 구글 Custom Search API
- DART 공시정보 API
- 카카오맵 API
- 네이버 클로바 OCR

### 웹 스크래핑
- theVC (투자 정보)
- 크런치베이스
- 벤처스퀘어, platum
- 부동산 전문 사이트

## 🔮 예측 모델

### 핵심 지표
1. **뉴스 기반 신호**
   - 사옥 이전 관련 보도
   - 계약 기간 명시 여부
   - 발표 시점 분석

2. **재무/성장 지표**
   - 투자 유치 이력
   - 직원 수 증가율
   - 매출 성장률

3. **부동산 관련 신호**
   - 현재 임대차 계약 상태
   - 공간 부족 징후
   - 신규 지역 진출 계획

### 위험도 계산
- 뉴스 관련성 점수 (30%)
- 계약 만료 임박도 (25%)
- 투자/성장 지표 (25%)
- 공시 정보 (20%)

## 🚀 설치 및 실행

### 1. 저장소 클론
```bash
git clone https://github.com/Oram-Lee/agent.git
cd agent
```

### 2. Python 의존성 설치
```bash
pip install requests beautifulsoup4 pandas python-dotenv
```

### 3. API 키 설정
`data_collector.py`에서 API 키 설정:
```python
api_keys = {
    'naver_client_id': 'YOUR_NAVER_CLIENT_ID',
    'naver_client_secret': 'YOUR_NAVER_CLIENT_SECRET',
    'google_api_key': 'YOUR_GOOGLE_API_KEY',
    'dart_api_key': 'YOUR_DART_API_KEY'
}
```

### 4. Firebase 설정
1. Firebase 프로젝트 생성
2. `firebase_config.js`에서 설정값 교체
3. Firestore 데이터베이스 생성

### 5. 데이터 수집 실행
```bash
python data_collector.py
```

### 6. 대시보드 확인
GitHub Pages: https://oram-lee.github.io/agent

## 📈 사용 사례

### 부동산 중개업체
- 잠재 고객 발굴
- 이전 수요 예측을 통한 영업 전략 수립

### 오피스 임대업체
- 공실 관리 최적화
- 신규 임차인 확보 전략

### 투자자/애널리스트
- 부동산 시장 트렌드 분석
- 기업 성장 지표 모니터링

## 🔄 향후 개발 계획

- [ ] 머신러닝 모델 고도화
- [ ] 알림 시스템 구축
- [ ] 모바일 앱 개발
- [ ] 상권 분석 기능 추가
- [ ] API 서비스 제공

## 📝 라이선스

MIT License

## 👨‍💻 개발자

- 개발: Oram-Lee
- 도구: Claude Code