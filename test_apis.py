"""
API 키 테스트 스크립트
각 API가 정상적으로 작동하는지 확인
"""

import requests
import json
from datetime import datetime

# API 키 설정
API_KEYS = {
    'naver_client_id': 'MRrqB4usbuuk9uuXzZDM',
    'naver_client_secret': 'Yoionk4bGp',
    'naver_blog_client_id': '7kbgK3Fi__DX0_cnJOEp',
    'naver_blog_client_secret': 'QyfsHO2dIk',
    'google_api_key': 'AIzaSyBNDjMJqJnzpJKc3Hnfq2yh40UTkWPFmJU',
    'google_search_engine_id': '0623a984354754d30',
    'dart_api_key': '416dbd4f88fd71c98204eec5b5502a4daf8045cd',
}

def test_naver_search():
    """네이버 검색 API 테스트"""
    print("🔍 네이버 검색 API 테스트...")
    
    try:
        url = "https://openapi.naver.com/v1/search/news.json"
        headers = {
            'X-Naver-Client-Id': API_KEYS['naver_client_id'],
            'X-Naver-Client-Secret': API_KEYS['naver_client_secret']
        }
        params = {
            'query': '네이버 사옥 이전',
            'display': 5,
            'start': 1,
            'sort': 'date'
        }
        
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        
        data = response.json()
        print(f"✅ 성공! {len(data.get('items', []))}개 결과 조회")
        
        if data.get('items'):
            print(f"   첫 번째 결과: {data['items'][0]['title']}")
        
        return True
        
    except Exception as e:
        print(f"❌ 실패: {e}")
        return False

def test_naver_blog():
    """네이버 블로그 API 테스트"""
    print("\n📝 네이버 블로그 API 테스트...")
    
    try:
        url = "https://openapi.naver.com/v1/search/blog.json"
        headers = {
            'X-Naver-Client-Id': API_KEYS['naver_blog_client_id'],
            'X-Naver-Client-Secret': API_KEYS['naver_blog_client_secret']
        }
        params = {
            'query': '카카오 사옥',
            'display': 5,
            'start': 1,
            'sort': 'date'
        }
        
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        
        data = response.json()
        print(f"✅ 성공! {len(data.get('items', []))}개 결과 조회")
        
        if data.get('items'):
            print(f"   첫 번째 결과: {data['items'][0]['title']}")
        
        return True
        
    except Exception as e:
        print(f"❌ 실패: {e}")
        return False

def test_google_search():
    """구글 Custom Search API 테스트"""
    print("\n🌐 구글 Custom Search API 테스트...")
    
    try:
        url = "https://www.googleapis.com/customsearch/v1"
        params = {
            'key': API_KEYS['google_api_key'],
            'cx': API_KEYS['google_search_engine_id'],
            'q': '쿠팡 사옥 이전',
            'num': 5
        }
        
        response = requests.get(url, params=params)
        response.raise_for_status()
        
        data = response.json()
        items = data.get('items', [])
        print(f"✅ 성공! {len(items)}개 결과 조회")
        
        if items:
            print(f"   첫 번째 결과: {items[0]['title']}")
        
        return True
        
    except Exception as e:
        print(f"❌ 실패: {e}")
        return False

def test_dart_api():
    """DART API 테스트"""
    print("\n📊 DART API 테스트...")
    
    try:
        url = "https://opendart.fss.or.kr/api/list.json"
        params = {
            'crtfc_key': API_KEYS['dart_api_key'],
            'corp_name': '네이버',
            'bgn_de': '20231201',
            'end_de': '20241201',
            'page_no': 1,
            'page_count': 5
        }
        
        response = requests.get(url, params=params)
        response.raise_for_status()
        
        data = response.json()
        
        if data.get('status') == '000':
            items = data.get('list', [])
            print(f"✅ 성공! {len(items)}개 공시 조회")
            
            if items:
                print(f"   첫 번째 공시: {items[0].get('report_nm', 'N/A')}")
        else:
            print(f"⚠️ 응답 상태: {data.get('status')} - {data.get('message', '')}")
        
        return True
        
    except Exception as e:
        print(f"❌ 실패: {e}")
        return False

def main():
    """모든 API 테스트 실행"""
    print("🚀 API 연결 테스트 시작\n")
    print("=" * 50)
    
    results = []
    
    results.append(("네이버 검색", test_naver_search()))
    results.append(("네이버 블로그", test_naver_blog()))
    results.append(("구글 검색", test_google_search()))
    results.append(("DART", test_dart_api()))
    
    print("\n" + "=" * 50)
    print("📋 테스트 결과 요약:")
    
    success_count = 0
    for name, success in results:
        status = "✅ 성공" if success else "❌ 실패"
        print(f"   {name}: {status}")
        if success:
            success_count += 1
    
    print(f"\n🎯 전체 결과: {success_count}/{len(results)} 성공")
    
    if success_count == len(results):
        print("🎉 모든 API가 정상 작동합니다!")
    else:
        print("⚠️ 일부 API에 문제가 있습니다.")

if __name__ == "__main__":
    main()