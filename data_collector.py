import requests
import json
import time
from datetime import datetime, timedelta
import re
from typing import Dict, List, Optional
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class OfficeRelocationPredictor:
    def __init__(self, api_keys: Dict[str, str]):
        self.api_keys = api_keys
        self.companies_data = {}
        
    def collect_all_data(self, company_list: List[str]) -> Dict:
        """모든 데이터 소스에서 정보 수집"""
        results = {}
        
        for company in company_list:
            logger.info(f"데이터 수집 시작: {company}")
            
            company_data = {
                'name': company,
                'collection_time': datetime.now().isoformat(),
                'news_data': self.collect_news_data(company),
                'dart_data': self.collect_dart_data(company),
                'investment_data': self.collect_investment_data(company),
                'blog_data': self.collect_blog_data(company),
                'risk_score': 0,
                'prediction': None
            }
            
            # 위험도 점수 계산
            company_data['risk_score'] = self.calculate_risk_score(company_data)
            company_data['prediction'] = self.generate_prediction(company_data)
            
            results[company] = company_data
            
            # API 호출 제한 고려
            time.sleep(1)
            
        return results
    
    def collect_news_data(self, company: str) -> List[Dict]:
        """네이버 검색 API + 구글 Custom Search로 뉴스 수집"""
        news_data = []
        
        # 네이버 검색 API
        if 'naver_client_id' in self.api_keys:
            naver_results = self._search_naver_news(company)
            news_data.extend(naver_results)
        
        # 구글 Custom Search API
        if 'google_api_key' in self.api_keys:
            google_results = self._search_google_news(company)
            news_data.extend(google_results)
            
        return news_data
    
    def _search_naver_news(self, company: str) -> List[Dict]:
        """네이버 뉴스 검색"""
        try:
            url = "https://openapi.naver.com/v1/search/news.json"
            query = f"{company} 사옥 이전 OR 새 본사 OR 신사옥"
            
            headers = {
                'X-Naver-Client-Id': self.api_keys['naver_client_id'],
                'X-Naver-Client-Secret': self.api_keys['naver_client_secret']
            }
            
            params = {
                'query': query,
                'display': 20,
                'start': 1,
                'sort': 'date'
            }
            
            response = requests.get(url, headers=headers, params=params)
            response.raise_for_status()
            
            results = []
            for item in response.json().get('items', []):
                # 계약 기간 추출
                contract_period = self._extract_contract_period(item['description'])
                
                results.append({
                    'title': item['title'],
                    'description': item['description'],
                    'link': item['link'],
                    'pubDate': item['pubDate'],
                    'source': 'naver',
                    'contract_period': contract_period,
                    'relevance_score': self._calculate_relevance_score(item['title'] + item['description'])
                })
                
            return results
            
        except Exception as e:
            logger.error(f"네이버 뉴스 검색 실패: {e}")
            return []
    
    def _search_google_news(self, company: str) -> List[Dict]:
        """구글 Custom Search로 뉴스 검색"""
        try:
            url = "https://www.googleapis.com/customsearch/v1"
            query = f"{company} 사옥 이전 OR 본사 이전"
            
            params = {
                'key': self.api_keys['google_api_key'],
                'cx': self.api_keys['google_search_engine_id'],
                'q': query,
                'num': 10,
                'dateRestrict': 'y2'  # 최근 2년
            }
            
            response = requests.get(url, params=params)
            response.raise_for_status()
            
            results = []
            for item in response.json().get('items', []):
                contract_period = self._extract_contract_period(item.get('snippet', ''))
                
                results.append({
                    'title': item['title'],
                    'description': item.get('snippet', ''),
                    'link': item['link'],
                    'source': 'google',
                    'contract_period': contract_period,
                    'relevance_score': self._calculate_relevance_score(item['title'] + item.get('snippet', ''))
                })
                
            return results
            
        except Exception as e:
            logger.error(f"구글 검색 실패: {e}")
            return []
    
    def collect_dart_data(self, company: str) -> Dict:
        """DART API로 공시 정보 수집"""
        try:
            # DART API 구현
            url = "https://opendart.fss.or.kr/api/list.json"
            
            params = {
                'crtfc_key': self.api_keys.get('dart_api_key', ''),
                'corp_name': company,
                'bgn_de': (datetime.now() - timedelta(days=365)).strftime('%Y%m%d'),
                'end_de': datetime.now().strftime('%Y%m%d'),
                'page_no': 1,
                'page_count': 100
            }
            
            response = requests.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            if data.get('status') == '000':
                return self._analyze_dart_data(data.get('list', []))
            else:
                return {}
                
        except Exception as e:
            logger.error(f"DART 데이터 수집 실패: {e}")
            return {}
    
    def collect_investment_data(self, company: str) -> Dict:
        """웹 스크래핑으로 투자 정보 수집"""
        investment_signals = []
        
        # theVC 데이터 스크래핑 (가상 구현)
        thevc_data = self._scrape_thevc(company)
        if thevc_data:
            investment_signals.extend(thevc_data)
        
        # 기타 투자 정보 사이트들
        # venture_square_data = self._scrape_venture_square(company)
        # platum_data = self._scrape_platum(company)
        
        return {
            'investment_signals': investment_signals,
            'funding_rounds': self._extract_funding_info(investment_signals),
            'growth_indicators': self._calculate_growth_indicators(investment_signals)
        }
    
    def collect_blog_data(self, company: str) -> List[Dict]:
        """네이버 블로그 API로 부동산 관련 정보 수집"""
        try:
            url = "https://openapi.naver.com/v1/search/blog.json"
            query = f"{company} 사옥 OR 오피스 OR 임대"
            
            headers = {
                'X-Naver-Client-Id': self.api_keys['naver_client_id'],
                'X-Naver-Client-Secret': self.api_keys['naver_client_secret']
            }
            
            params = {
                'query': query,
                'display': 20,
                'start': 1,
                'sort': 'date'
            }
            
            response = requests.get(url, headers=headers, params=params)
            response.raise_for_status()
            
            results = []
            for item in response.json().get('items', []):
                results.append({
                    'title': item['title'],
                    'description': item['description'],
                    'link': item['link'],
                    'bloggerlink': item['bloggerlink'],
                    'postdate': item['postdate'],
                    'relevance_score': self._calculate_relevance_score(item['title'] + item['description'])
                })
                
            return results
            
        except Exception as e:
            logger.error(f"블로그 데이터 수집 실패: {e}")
            return []
    
    def _extract_contract_period(self, text: str) -> Optional[int]:
        """텍스트에서 계약 기간 추출"""
        patterns = [
            r'(\d+)년\s*계약',
            r'(\d+)년간\s*임차',
            r'향후\s*(\d+)년',
            r'계약기간\s*(\d+)년'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                return int(match.group(1))
        
        return None
    
    def _calculate_relevance_score(self, text: str) -> float:
        """텍스트 관련성 점수 계산"""
        keywords = [
            ('사옥 이전', 10), ('본사 이전', 10), ('신사옥', 8),
            ('새 본사', 8), ('오피스 이전', 7), ('임대차', 5),
            ('계약 만료', 6), ('공간 확장', 4), ('직원 증가', 3)
        ]
        
        score = 0
        for keyword, weight in keywords:
            if keyword in text:
                score += weight
        
        return min(score, 100)
    
    def calculate_risk_score(self, company_data: Dict) -> float:
        """종합 위험도 점수 계산"""
        score = 0
        
        # 뉴스 관련성 점수
        news_scores = [item['relevance_score'] for item in company_data['news_data']]
        if news_scores:
            score += max(news_scores) * 0.3
        
        # 계약 기간 기반 점수
        contract_periods = [item['contract_period'] for item in company_data['news_data'] 
                          if item['contract_period']]
        if contract_periods:
            # 최근 계약이 5년 전이면 고위험
            avg_period = sum(contract_periods) / len(contract_periods)
            if avg_period <= 1:
                score += 40
            elif avg_period <= 2:
                score += 25
        
        # 투자 신호 점수
        investment_signals = company_data['investment_data']['investment_signals']
        score += len(investment_signals) * 5
        
        # DART 공시 점수
        if company_data['dart_data']:
            score += 20
        
        return min(score, 100)
    
    def generate_prediction(self, company_data: Dict) -> Dict:
        """이전 시기 예측"""
        risk_score = company_data['risk_score']
        
        if risk_score >= 80:
            timeframe = "3-6개월 내"
            confidence = "높음"
        elif risk_score >= 60:
            timeframe = "6-12개월 내"
            confidence = "중간"
        elif risk_score >= 40:
            timeframe = "1-2년 내"
            confidence = "낮음"
        else:
            timeframe = "예측 불가"
            confidence = "매우 낮음"
        
        return {
            'timeframe': timeframe,
            'confidence': confidence,
            'factors': self._extract_key_factors(company_data)
        }
    
    def _extract_key_factors(self, company_data: Dict) -> List[str]:
        """주요 예측 요인 추출"""
        factors = []
        
        # 뉴스 기반 요인
        for news in company_data['news_data']:
            if news['relevance_score'] > 50:
                factors.append(f"언론 보도: {news['title'][:30]}...")
        
        # 투자 기반 요인
        investment_signals = company_data['investment_data']['investment_signals']
        if investment_signals:
            factors.append(f"투자 활동: {len(investment_signals)}건")
        
        return factors[:5]  # 상위 5개만
    
    def save_to_json(self, data: Dict, filename: str):
        """결과를 JSON 파일로 저장"""
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        logger.info(f"데이터 저장 완료: {filename}")

# 사용 예시
if __name__ == "__main__":
    # API 키 설정
    api_keys = {
        'naver_client_id': 'YOUR_NAVER_CLIENT_ID',
        'naver_client_secret': 'YOUR_NAVER_CLIENT_SECRET',
        'google_api_key': 'YOUR_GOOGLE_API_KEY',
        'google_search_engine_id': 'YOUR_SEARCH_ENGINE_ID',
        'dart_api_key': 'YOUR_DART_API_KEY'
    }
    
    # 타겟 기업 리스트
    companies = [
        '네이버', '카카오', '쿠팡', '하이브', '크래프톤',
        '삼성바이오로직스', 'LG화학', 'SK하이닉스'
    ]
    
    # 예측기 초기화 및 실행
    predictor = OfficeRelocationPredictor(api_keys)
    results = predictor.collect_all_data(companies)
    
    # 결과 저장
    predictor.save_to_json(results, 'relocation_predictions.json')
    
    print("데이터 수집 및 예측 완료!")