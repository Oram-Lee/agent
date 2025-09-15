"""
collect_all_data 함수 단독 테스트
"""

import requests
import json
import time
from datetime import datetime, timedelta

# API 키 설정
API_KEYS = {
    'naver_client_id': 'MRrqB4usbuuk9uuXzZDM',
    'naver_client_secret': 'Yoionk4bGp',
    'google_api_key': 'AIzaSyBNDjMJqJnzpJKc3Hnfq2yh40UTkWPFmJU',
    'google_search_engine_id': '0623a984354754d30',
    'dart_api_key': '416dbd4f88fd71c98204eec5b5502a4daf8045cd'
}

def test_naver_search(company='네이버'):
    """네이버 검색 API 테스트"""
    print(f"🔍 네이버 검색 API: {company}...")
    
    try:
        url = "https://openapi.naver.com/v1/search/news.json"
        headers = {
            'X-Naver-Client-Id': API_KEYS['naver_client_id'],
            'X-Naver-Client-Secret': API_KEYS['naver_client_secret']
        }
        
        keywords = [
            f'{company} 사옥 이전',
            f'{company} 새 본사',
            f'{company} 신사옥',
            f'{company} 오피스 이전'
        ]
        
        all_results = []
        
        for keyword in keywords:
            params = {
                'query': keyword,
                'display': 5,
                'start': 1,
                'sort': 'date'
            }
            
            response = requests.get(url, headers=headers, params=params)
            if response.status_code == 200:
                data = response.json()
                items = data.get('items', [])
                
                for item in items:
                    item['search_keyword'] = keyword
                    # 중복 제거
                    if not any(existing['link'] == item['link'] for existing in all_results):
                        all_results.append(item)
            
            time.sleep(0.1)
        
        print(f"✅ 성공! {len(all_results)}개 결과 조회")
        if all_results:
            print(f"   최신 뉴스: {all_results[0]['title'][:50]}...")
            
        return all_results
        
    except Exception as e:
        print(f"❌ 실패: {e}")
        return []

def test_dart_api_fixed(company='네이버'):
    """DART API 테스트"""
    print(f"📊 DART API: {company}...")
    
    try:
        url = "https://opendart.fss.or.kr/api/list.json"
        
        end_date = datetime.now()
        start_date = end_date - timedelta(days=90)
        
        params = {
            'crtfc_key': API_KEYS['dart_api_key'],
            'corp_name': company,
            'bgn_de': start_date.strftime('%Y%m%d'),
            'end_de': end_date.strftime('%Y%m%d'),
            'page_no': 1,
            'page_count': 20
        }
        
        response = requests.get(url, params=params)
        if response.status_code == 200:
            data = response.json()
            
            if data.get('status') == '000':
                items = data.get('list', [])
                
                office_keywords = ['사옥', '본사', '이전', '임대', '부동산', '시설투자', '건물', '오피스', '사무실']
                office_related = []
                
                for item in items:
                    report_name = item.get('report_nm', '').lower()
                    for keyword in office_keywords:
                        if keyword in report_name:
                            office_related.append(item)
                            break
                
                print(f"✅ 성공! 전체 {len(items)}개, 사옥관련 {len(office_related)}개")
                
                return {
                    'total': items,
                    'office_related': office_related,
                    'count': len(items),
                    'office_count': len(office_related)
                }
            else:
                print(f"⚠️ 상태: {data.get('status')} - {data.get('message', '')}")
                return {'total': [], 'office_related': [], 'count': 0, 'office_count': 0}
        else:
            print(f"❌ HTTP 오류: {response.status_code}")
            return {'total': [], 'office_related': [], 'count': 0, 'office_count': 0}
        
    except Exception as e:
        print(f"❌ 실패: {e}")
        return {'total': [], 'office_related': [], 'count': 0, 'office_count': 0}

def calculate_risk_score(news_data, google_data, dart_data):
    """위험도 점수 계산"""
    score = 0
    
    # 뉴스 기반 점수 (최대 40점)
    score += min(len(news_data) * 3, 40)
    
    # 구글 검색 결과 점수 (최대 30점)
    score += min(len(google_data) * 2, 30)
    
    # DART 사옥 관련 공시 점수 (최대 30점)
    score += min(dart_data['office_count'] * 10, 30)
    
    return min(score, 100)

def generate_prediction(risk_score, news_data, dart_data):
    """예측 결과 생성"""
    if risk_score >= 70:
        return "고위험 - 6개월 내 이전 가능성 높음"
    elif risk_score >= 40:
        return "중위험 - 1년 내 이전 검토 가능"
    elif risk_score >= 20:
        return "저위험 - 장기적 모니터링 필요"
    else:
        return "최저위험 - 이전 계획 없음"

def collect_all_data(company_name):
    """모든 데이터 소스에서 정보 수집 (개선된 버전)"""
    print(f"\n🏢 {company_name} 종합 데이터 수집")
    print("=" * 50)
    
    # 1. 네이버 뉴스 검색
    print("1️⃣ 네이버 뉴스 수집 중...")
    naver_news = test_naver_search(company_name)
    time.sleep(1)
    
    # 2. 구글 검색
    print("\n2️⃣ 구글 검색 수집 중...")
    try:
        url = "https://www.googleapis.com/customsearch/v1"
        params = {
            'key': API_KEYS['google_api_key'],
            'cx': API_KEYS['google_search_engine_id'],
            'q': f'{company_name} 사옥 이전 OR 본사 이전',
            'num': 10
        }
        response = requests.get(url, params=params)
        if response.status_code == 200:
            google_data = response.json().get('items', [])
            print(f"🌐 구글 검색: {len(google_data)}건")
        else:
            google_data = []
            print(f"🌐 구글 검색: HTTP {response.status_code} 오류")
    except Exception as e:
        google_data = []
        print(f"🌐 구글 검색: 오류 - {e}")
    
    time.sleep(1)
    
    # 3. DART 공시정보
    print("\n3️⃣ DART 공시 수집 중...")
    dart_data = test_dart_api_fixed(company_name)
    time.sleep(1)
    
    # 4. 위험도 점수 계산
    print("\n4️⃣ 위험도 분석 중...")
    risk_score = calculate_risk_score(naver_news, google_data, dart_data)
    
    # 5. 예측 생성
    prediction = generate_prediction(risk_score, naver_news, dart_data)
    
    result = {
        'company': company_name,
        'collection_time': datetime.now().isoformat(),
        'risk_score': risk_score,
        'prediction': prediction,
        'data_counts': {
            'naver_news': len(naver_news),
            'google_results': len(google_data),
            'dart_total': dart_data['count'],
            'dart_office': dart_data['office_count']
        },
        'sample_data': {
            'recent_news': naver_news[:3],
            'dart_reports': dart_data['office_related'][:3]
        }
    }
    
    print(f"\n📊 {company_name} 수집 완료!")
    print("-" * 30)
    print(f"   위험도 점수: {risk_score}/100")
    print(f"   예측 결과: {prediction}")
    print(f"   수집 데이터:")
    print(f"     • 네이버 뉴스: {len(naver_news)}건")
    print(f"     • 구글 검색: {len(google_data)}건") 
    print(f"     • DART 전체: {dart_data['count']}건")
    print(f"     • DART 사옥관련: {dart_data['office_count']}건")
    print("=" * 50)
    
    return result

# 테스트 실행
if __name__ == "__main__":
    print("🧪 collect_all_data 함수 테스트")
    
    test_company = '네이버'
    result = collect_all_data(test_company)
    
    print(f"\n✅ 테스트 완료!")
    print(f"반환된 데이터 키: {list(result.keys())}")
    print(f"위험도 점수: {result['risk_score']}")