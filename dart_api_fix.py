"""
DART API 개선 버전
1. 기업코드를 먼저 조회한 후 상세 검색
2. 검색 기간 3개월 제한 적용
"""

import requests
import json
from datetime import datetime, timedelta

DART_API_KEY = '416dbd4f88fd71c98204eec5b5502a4daf8045cd'

def get_corp_code(company_name):
    """기업명으로 고유번호(corp_code) 조회"""
    try:
        # DART에서 제공하는 고유번호 파일 다운로드
        url = "https://opendart.fss.or.kr/api/corpCode.xml"
        params = {'crtfc_key': DART_API_KEY}
        
        print(f"🔍 {company_name} 기업코드 검색 중...")
        response = requests.get(url, params=params)
        
        if response.status_code == 200:
            # XML을 텍스트로 파싱해서 기업명 찾기
            content = response.text
            
            # 간단한 텍스트 매칭 (실제로는 XML 파서 사용 권장)
            lines = content.split('\n')
            for i, line in enumerate(lines):
                if company_name in line:
                    # 앞뒤 라인에서 corp_code 찾기
                    for j in range(max(0, i-5), min(len(lines), i+5)):
                        if '<corp_code>' in lines[j]:
                            corp_code = lines[j].replace('<corp_code>', '').replace('</corp_code>', '').strip()
                            print(f"✅ {company_name} 기업코드: {corp_code}")
                            return corp_code
            
            print(f"❌ {company_name} 기업코드를 찾을 수 없습니다.")
            return None
            
    except Exception as e:
        print(f"❌ 기업코드 검색 실패: {e}")
        return None

def search_dart_reports(company_name, corp_code=None):
    """DART 공시 검색 (개선된 버전)"""
    try:
        url = "https://opendart.fss.or.kr/api/list.json"
        
        # 현재날짜에서 3개월 전으로 설정
        end_date = datetime.now()
        start_date = end_date - timedelta(days=90)  # 3개월
        
        params = {
            'crtfc_key': DART_API_KEY,
            'bgn_de': start_date.strftime('%Y%m%d'),
            'end_de': end_date.strftime('%Y%m%d'),
            'page_no': 1,
            'page_count': 20
        }
        
        # 기업코드가 있으면 사용, 없으면 기업명으로 검색
        if corp_code:
            params['corp_code'] = corp_code
            print(f"📊 {company_name} 기업코드({corp_code})로 DART 검색...")
        else:
            params['corp_name'] = company_name
            print(f"📊 {company_name} 기업명으로 DART 검색 (3개월 제한)...")
        
        response = requests.get(url, params=params)
        response.raise_for_status()
        
        data = response.json()
        
        if data.get('status') == '000':
            reports = data.get('list', [])
            print(f"✅ 성공! {len(reports)}개 공시 발견")
            
            # 사옥 관련 공시 필터링
            office_related = []
            keywords = ['사옥', '본사', '이전', '임대', '부동산', '시설투자', '건물', '오피스']
            
            for report in reports:
                report_name = report.get('report_nm', '').lower()
                for keyword in keywords:
                    if keyword in report_name:
                        office_related.append(report)
                        break
            
            print(f"🏢 사옥 관련 공시: {len(office_related)}건")
            
            return {
                'total_reports': reports,
                'office_related': office_related,
                'company': company_name,
                'search_period': f"{start_date.strftime('%Y-%m-%d')} ~ {end_date.strftime('%Y-%m-%d')}"
            }
        else:
            print(f"⚠️ DART API 응답: {data.get('status')} - {data.get('message', '')}")
            return {'total_reports': [], 'office_related': [], 'company': company_name}
            
    except Exception as e:
        print(f"❌ DART 검색 실패: {e}")
        return {'total_reports': [], 'office_related': [], 'company': company_name}

def test_dart_improved():
    """개선된 DART API 테스트"""
    companies = ['네이버', '카카오', '삼성전자', '엘지화학']
    
    results = {}
    
    for company in companies:
        print(f"\n{'='*50}")
        print(f"🏢 {company} DART 데이터 수집")
        print('='*50)
        
        # 방법 1: 기업코드로 검색 시도
        corp_code = get_corp_code(company)
        
        # 방법 2: 기업명으로 검색 (3개월 제한)
        dart_data = search_dart_reports(company, corp_code)
        results[company] = dart_data
        
        print(f"📊 {company} 결과:")
        print(f"   전체 공시: {len(dart_data['total_reports'])}건")
        print(f"   사옥 관련: {len(dart_data['office_related'])}건")
        
        if dart_data['office_related']:
            print("   관련 공시 목록:")
            for i, report in enumerate(dart_data['office_related'][:3]):
                print(f"     {i+1}. {report.get('report_nm', 'N/A')}")
        
        # API 호출 제한 고려
        import time
        time.sleep(1)
    
    return results

if __name__ == "__main__":
    print("🚀 개선된 DART API 테스트 시작!")
    results = test_dart_improved()
    
    # 결과 저장
    with open('dart_results_improved.json', 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    print(f"\n🎉 테스트 완료! 결과가 'dart_results_improved.json'에 저장되었습니다.")