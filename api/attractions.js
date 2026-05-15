/**
 * Vercel Serverless Function for Busan Attractions API
 * /api/attractions 엔드포인트
 * 
 * 환경 변수 설정 필요:
 * DATA_GO_KR_API_KEY: data.go.kr에서 발급받은 인증 키
 */

export default async function handler(req, res) {
    // CORS 헤더 설정
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // OPTIONS 요청 처리 (preflight)
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // GET 요청만 허용
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { pageNo = 1, numOfRows = 10, searchQuery = '', UC_SEQ = '' } = req.query;

        // 환경 변수에서 API 키 가져오기
        const apiKey = process.env.DATA_GO_KR_API_KEY;
        if (!apiKey) {
            console.error('API Key not found in environment variables');
            return res.status(500).json({
                resultCode: 'ERROR',
                resultMsg: '서버 설정 오류: API 키가 없습니다.',
                items: []
            });
        }

        // data.go.kr API URL
        const baseUrl = 'http://apis.data.go.kr/6260000/AttractionService/getAttractionKr';

        // 요청 파라미터 구성
        const params = new URLSearchParams({
            ServiceKey: apiKey,
            pageNo: String(pageNo),
            numOfRows: String(numOfRows),
            resultType: 'json'
        });

        // UC_SEQ가 제공되면 추가
        if (UC_SEQ) {
            params.append('UC_SEQ', UC_SEQ);
        }

        const apiUrl = `${baseUrl}?${params.toString()}`;

        // data.go.kr API 호출
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            },
            // 타임아웃 설정 (10초)
            timeout: 10000
        });

        if (!response.ok) {
            throw new Error(`API responded with status ${response.status}`);
        }

        const data = await response.json();

        // 응답 데이터 처리
        if (data.response && data.response.body) {
            const body = data.response.body;

            // 검색어 필터링 (클라이언트 사이드 필터링)
            let items = body.items ? body.items.item : [];
            
            if (!Array.isArray(items)) {
                items = items ? [items] : [];
            }

            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                items = items.filter(item => 
                    (item.MAIN_TITLE && item.MAIN_TITLE.toLowerCase().includes(query)) ||
                    (item.SUBTITLE && item.SUBTITLE.toLowerCase().includes(query)) ||
                    (item.GUGUN_NM && item.GUGUN_NM.toLowerCase().includes(query)) ||
                    (item.PLACE && item.PLACE.toLowerCase().includes(query))
                );
            }

            return res.status(200).json({
                resultCode: body.resultCode || '00',
                resultMsg: body.resultMsg || 'OK',
                totalCount: items.length,
                pageNo: Number(pageNo),
                numOfRows: Number(numOfRows),
                items: items
            });

        } else if (data.resultCode === '00') {
            // 다른 응답 형식 (직접 items 포함)
            let items = data.items ? data.items.item : [];
            
            if (!Array.isArray(items)) {
                items = items ? [items] : [];
            }

            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                items = items.filter(item => 
                    (item.MAIN_TITLE && item.MAIN_TITLE.toLowerCase().includes(query)) ||
                    (item.SUBTITLE && item.SUBTITLE.toLowerCase().includes(query)) ||
                    (item.GUGUN_NM && item.GUGUN_NM.toLowerCase().includes(query)) ||
                    (item.PLACE && item.PLACE.toLowerCase().includes(query))
                );
            }

            return res.status(200).json({
                resultCode: '00',
                resultMsg: 'OK',
                totalCount: items.length,
                pageNo: Number(pageNo),
                numOfRows: Number(numOfRows),
                items: items
            });

        } else {
            throw new Error(data.resultMsg || 'API error');
        }

    } catch (error) {
        console.error('API Error:', error.message);

        return res.status(500).json({
            resultCode: 'ERROR',
            resultMsg: `서버 오류: ${error.message}`,
            totalCount: 0,
            pageNo: 1,
            numOfRows: 10,
            items: []
        });
    }
}
