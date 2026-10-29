/* 렛츠바이 분석: 카테고리·단위가격·월별 지출·시즌·전년 비교·슈링크플레이션 (브라우저/Node 공용, 서버 없음) */
(function (root) {
  // [대분류, 소분류, 키워드] — 위에서부터 먼저 맞는 것. ~ = 한글 단어 끝
  const B = '(?![가-힣])';
  const R = (s, f) => new RegExp(s.replace(/~/g, B), f);
  const DICT = [
    ['식품', '음료', R('비타500|박카스|오로나민|비타민워터|파워에이드|토레타|옥수수수염차|헛개|컨디션|여명808|모닝케어')],
    ['생활용품', '세탁·청소·생활', R('세탁\\s*캡슐|캡슐\\s*세제|식기세척기\\s*세제|피지|테크|퍼실|다우니|샤프란|피죤|아우라|비트~|리큐|한입세제|스파크|엑스트라|유한락스|홈스타|매직블럭|물먹는하마|산도깨비|에프킬라|홈매트')],
    ['영양제', '영양제', R('비타민|오메가|유산균|프로바이오|프리바이오|포스트바이오|루테인|마그네슘|밀크씨슬|밀크시슬|홍삼|정관장|영양제|콜라겐|철분|아연|칼슘|멀티비타|글루코사민|프로폴리스|엽산|코엔자임|코큐텐|크릴|락토핏|락토|종합영양|오쏘몰|센트룸|덴마크유산균|비오틴|쏘팔메토|종근당|고려은단|뉴트리원|솔가|나우푸드|NOW~|닥터스베스트|얼라이브|GNC|뉴트리코어|에스더포뮬러|여에스더|안국|일양|광동|경남제약|레모나|nmn|알티지|rtg|침향|녹용|흑마늘|보스웰리아|MSM|단백질\\s*보충|프로틴|wpi|wpc|bcaa|크레아틴|비타~|아르기닌|가르시니아|다이어트\\s*보조|효소~|식이섬유|차전자피|글루타치온|히알루론|석류\\s*콜라겐|어린이\\s*비타|키즈\\s*유산균', 'i')],
    ['육아', '기저귀·물티슈', R('기저귀|하기스|팸퍼스|보솜이|마미포코|군~|메리즈|나비잠|킨도|팬티형\\s*\\d|아기\\s*물티슈|유아\\s*물티슈|베베숲|순수한면|몽드드')],
    ['육아', '분유·이유식', R('분유|앱솔루트|임페리얼|일동후디스|트루맘|압타밀|이유식|베이비푸드|아기\\s*과자|떡뻥|퓨어잇|베베쿡|엘빈즈|짱죽|아이배냇|키즈\\s*음료|뽀로로\\s*음료')],
    ['육아', '육아용품', R('아기|유아|키즈|베이비|아동|젖병|쪽쪽이|노리개|치발기|유모차|카시트|아기띠|턱받이|어린이|장난감|레고|블록~|색연필|크레파스|스케치북|문구|학용품|기저귀\\s*가방|역류방지|아이~')],
    ['반려동물', '반려동물', R('사료|고양이|강아지|반려|펫~|펫\\s|모래|츄르|로얄캐닌|캐닌|오리젠|하림펫|배변패드|캣타워|캣닢|간식\\s*껌|덴탈껌|애견|애묘|ANF|나우~|지위픽|뉴트로|힐스~|퓨리나|템테이션|이나바|두부모래|벤토나이트', 'i')],
    ['식품', '간식·과자', R('과자|스낵|초코|쿠키|파이~|젤리|사탕|캔디|칩~|비스킷|크래커|아이스크림|떡~|꿀떡|빵~|케이크|초코파이|웨하스|팝콘|견과|아몬드|호두|캐슈|피스타치오|마카다미아|땅콩|육포|오징어채|쥐포|양갱|약과|마카롱|도넛|와플~|시리얼|그래놀라|에너지바|프로틴바|오리온|롯데제과|해태|크라운|농심~|빼빼로|포카칩|새우깡|꼬북칩|허니버터|홈런볼|몽쉘|오예스|칸쵸|마이쮸|하리보|츄파춥스|자일리톨|껌~')],
    ['식품', '간편식', R('김밥|도시락|볶음밥|비빔밥|주먹밥|즉석|햇반|즉석밥|오뚜기밥|컵밥|레토르트|밀키트|국~|탕~|찌개|카레|짜장|죽~|피자|치킨|돈까스|돈가스|너겟|삼계탕|곰탕|설렁탕|육개장|미역국|함박|미트볼|동그랑땡|떡갈비|핫도그|만두|프레시지|마이셰프|쿡킷|냉동|전자레인지용|간편식|덮밥|샌드위치|버거')],
    ['생활용품', '화장지·위생', R('화장지|휴지|두루마리|키친\\s*타[올월]|물티슈|생리대|팬티라이너|오버나이트|좋은느낌|화이트~|위스퍼|라엘|쏘피|마스크~|KF94|KF80|덴탈마스크|면봉|티슈|\\d+\\s*롤|롤\\s*휴지|코디~|깨끗한나라|크리넥스|잘풀리는집|모나리자|유한킴벌리|순수~|미용티슈|손소독|소독제|밴드~|대일밴드|반창고|파스~|파스\\s', 'i')],
    ['생활용품', '세탁·청소·생활', R('세제|유연제|락스|세정|표백|청소|섬유탈취|제습|방향제|탈취|수세미|고무장갑|쓰레기\\s*봉투|종량제|건전지|배터리|전구|형광등|옷걸이|빨래|건조대|돌돌이|테이프~|청소포|물걸레|부직포|정전기|밀대|빗자루|쓰레받기|휴지통|분리수거|살충제|모기|방충|해충|바퀴|좀약|습기|곰팡이|배수구|변기|욕실|세면대|비닐~|노끈|건전지|우산|핫팩|손난로|수납|리빙박스|선반|행거|커튼|매트~|이불|베개|침구|패드~|토퍼|수건|타월|발매트')],
    ['뷰티', '바디·헤어', R('샴푸|린스|컨디셔너|트리트먼트|헤어|염색|바디\\s*워시|바디\\s*로션|바디\\s*클렌저|핸드\\s*크림|핸드워시|비누|치약|칫솔|가글|구강|치실|면도|쉐이빙|데오|려~|케라시스|엘라스틴|도브|니베아|해피바스|온더바디|아로마티카|닥터포헤어|TS샴푸|페리오|2080|죽염|센소다인|메디안|리스테린|질레트|쉬크|도루코|세타필|피지오겔|아토팜|일리윤|바세린|존슨즈', 'i')],
    ['뷰티', '화장품', R('(?<!생|아이스)크림~|(?<!생|아이스)크림\\s|수분크림|로션|세럼|에센스|앰플|선크림|선블록|선스틱|선쿠션|토너|스킨~|패드~|마스크팩|시트팩|클렌징|폼클렌|립~|립스틱|틴트|쿠션~|파운데이션|컨실러|아이섀도|마스카라|아이라이너|화장품|향수|미스트|설화수|라네즈|이니스프리|에뛰드|아이오페|헤라|닥터지|라로슈포제|아벤느|토리든|라운드랩|아누아|메디큐브|에스트라|구달|넘버즈인|마녀공장|코스알엑스|COSRX|바이오더마|키엘|에스티로더|랑콤|SK-II|올리브영', 'i')],
    ['캠핑·레저', '캠핑·레저', R('캠핑|접이식\\s*테이블|캠핑\\s*테이블|텐트|랜턴|의자~|체어|타프|버너|코펠|아이스박스|쿨러|침낭|매트리스\\s*캠핑|화로대|장작|숯~|그릴|부탄가스|등산|트레킹|자전거|낚시|골프|요가|필라테스|헬스|덤벨|수영|물안경|래쉬가드|스노클|튜브~|스키|보드~|배드민턴|테니스|축구공|농구공|줄넘기|폼롤러|아령|러닝|스포츠|코베아|스노우피크|헬리녹스|콜맨|노르디스크|캠프라인')],
    ['가전·디지털', '가전·디지털', R('전기포트|커피포트|에어프라이어|전자레인지|밥솥|청소기|충전기|케이블|이어폰|헤드폰|버즈|에어팟|키보드|마우스|모니터|노트북|태블릿|아이패드|아이폰|갤럭시|스피커|선풍기|서큘레이터|에어컨|가습기|제습기~|공기청정|필터~|드라이기|에어랩|고데기|전동칫솔|면도기|믹서|블렌더|토스터|와플|인덕션|하이라이트|전기그릴|정수기|냉장고|세탁기|건조기|TV~|빔프로젝터|프린터|잉크~|토너~|카메라|SD카드|메모리|보조배터리|멀티탭|어댑터|거치대|케이스~|보호필름|강화유리|스마트워치|워치~|로봇청소기|다이슨|샤오미|usb|hdmi|ssd|led|lg~|삼성~|필립스|브라운~|쿠쿠|쿠첸|테팔|드롱기|발뮤다', 'i')],
    ['주방', '주방용품', R('주걱|국자|뒤집개|집게|도마|프라이팬|후라이팬|냄비|웍~|칼~|식칼|가위~|식기|그릇|접시|공기~|대접|컵~|머그|텀블러|보온병|물병|밀폐|용기~|랩~|호일|지퍼백|위생백|위생장갑|키친|수저|젓가락|숟가락|포크|주방|채반|볼~|계량|저울|강판|필러|거름망|행주|설거지|식세기|락앤락|글라스락|코렐|해피콜|휘슬러|실리트|키친아트|타파웨어|스텐~|스테인리스|무쇠|에어프라이어\\s*종이|종이호일|이쑤시개|빨대|일회용|종이컵')],
    ['패션', '패션', R('티셔츠|반팔|긴팔|맨투맨|셔츠|블라우스|바지|팬츠|슬랙스|청바지|데님|자켓|재킷|점퍼|패딩|다운~|코트|니트|가디건|조끼|베스트~|양말|속옷|팬티|브라|런닝~|내복|잠옷|파자마|신발|운동화|스니커즈|구두|샌들|슬리퍼|크록스|부츠|모자|캡~|비니|장갑|목도리|머플러|가방|백팩|크로스백|지갑|벨트|레깅스|원피스|스커트|치마|후드|트레이닝|조거|수영복|선글라스|시계~|귀걸이|목걸이|반지|헤어핀|나이키|아디다스|뉴발란스|휠라|노스페이스|유니클로|탑텐|스파오|무신사|자라~|폴로|게스~|크록스')],
    ['식품', '육류', R('삼겹|목살|항정|가브리|돼지|돈육|한돈|소고기|우육|한우|미국산\\s*소|호주산|갈비|등심|안심|채끝|부채살|살치|양지|사태|우둔|홍두깨|다짐육|민찌|닭~|닭가슴살|닭다리|닭봉|닭안심|닭갈비|생닭|오리(?!온|지널)|베이컨|햄~|소시지|비엔나|차돌|우삼겹|불고기|양념육|왕구이|족발|보쌈|곱창|막창|대창|양고기|램~|스테이크|하림|마니커|허닭|아임닭')],
    ['식품', '수산', R('새우|연어|고등어|오징어|조기|굴비|갈치|삼치|꽁치|전복|굴~|홍합|꼬막|바지락|조개|멸치|김~|조미김|재래김|광천김|미역|다시마|톳|참치~|어묵|명란|게~|대게|킹크랩|꽃게|문어|낙지|쭈꾸미|주꾸미|장어|민어|광어|우럭|회~|해물|해산물|생선|북어|황태|코다리|가자미|동태|대구~|아귀|랍스터|관자|성게|날치알|도미')],
    ['식품', '과일', R('사과|배~|감귤|귤~|한라봉|천혜향|레드향|황금향|딸기|바나나|포도|샤인머스캣|거봉|복숭아|천도|자두|살구|수박|참외|멜론|키위|골드키위|블루베리|망고|체리|자몽|오렌지|레몬|라임|아보카도|토마토|방울토마토|대추~|감~|단감|홍시|곶감|석류|무화과|파인애플|용과|리치|애플망고|과일|청포도|유자')],
    ['식품', '채소', R('양파|대파|쪽파|파~|마늘|생강|감자|고구마|당근|양배추|배추|알배기|상추|로메인|양상추|깻잎|버섯|표고|새송이|느타리|팽이|양송이|애호박|호박|단호박|오이|가지~|콩나물|숙주|시금치|브로콜리|콜리플라워|파프리카|피망|무~|열무|부추|미나리|쑥갓|청경채|고추~|청양|꽈리|연근|우엉|더덕|도라지|옥수수|아스파라거스|샐러드|채소|야채|나물|비트~|케일|루꼴라|셀러리|양배')],
    ['식품', '유제품·계란', R('우유|요거트|요구르트|요플레|이오~|야쿠르트|치즈|버터|계란|달걀|대란|특란|왕란|유정란|메추리알|구~|비요뜨|생크림|휘핑|연유|그릭|덴마크~|매일유업|서울우유|남양|빙그레|바나나맛|상하목장|파스퇴르|소화가\\s*잘|락토프리')],
    ['식품', '커피·차', R('커피|원두|캡슐~|캡슐\\s*커피|네스프레소|돌체구스토|드립|아메리카노|라떼|콜드브루|믹스커피|맥심|카누|스타벅스|녹차|홍차|티백|보리차|옥수수차|둥굴레|루이보스|허브티|캐모마일|유자차|생강차|대추차|쌍화|커피포리|티~|말차|핫초코|코코아')],
    ['식품', '음료', R('생수|삼다수|백산수|아이시스|평창수|에비앙|탄산수|트레비|씨그램|탄산|콜라|펩시|사이다|칠성|환타|주스|쥬스|음료|이온~|포카리|게토레이|파워에이드|두유|베지밀|매일두유|아몬드\\s*브리즈|오트~|식혜|수정과|에너지\\s*드링크|몬스터|핫식스|레드불|제로~|맥주|와인|소주|막걸리|하이볼|위스키|논알콜')],
    ['식품', '쌀·면·빵', R('쌀~|백미|현미|찹쌀|잡곡|귀리|오트밀|퀴노아|라면|신라면|진라면|짜파게티|불닭|너구리|안성탕면|컵라면|국수|소면|중면|칼국수|파스타|스파게티|우동|냉면|쫄면|당면|쌀국수|떡볶이|떡국|식빵|베이글|모닝빵|크로와상|또띠아|만두|교자|밀떡|부침가루|튀김가루|밀가루|빵가루|핫케이크')],
    ['식품', '양념·소스', R('간장|된장|고추장|쌈장|소스|케첩|마요|머스타드|식초|설탕|소금|후추|참기름|들기름|올리브유|올리브오일|식용유|카놀라|포도씨유|아보카도오일|드레싱|조미료|다시~|다시다|미원|굴소스|맛술|미림|물엿|올리고당|꿀~|벌꿀|잼~|스프레드|누텔라|땅콩버터|고춧가루|깨~|통깨|와사비|액젓|까나리|멸치액젓|연두|백설|해찬들|샘표|몽고|청정원\\s*소스')],
    ['식품', '두부·가공', R('두부|순두부|유부|햄~|스팸|리챔|통조림|참치캔|동원참치|옥수수캔|김치|깍두기|총각김치|열무김치|파김치|반찬|장아찌|젓갈|어묵|맛살|크래미|단무지|피클|콩~|두유면|곤약|묵~|도토리묵')],
    ['생활용품', '세탁·청소·생활', R('디퓨저|캔들|향초|룸스프레이|섬유향수|페브리즈|습기제거|제습제|물먹는|탈취제|방향|고체비누|주방세제|퐁퐁|자연퐁|트리오|참그린|슈가버블|에코버|프로쉬|세탁조|과탄산|베이킹소다|구연산|소독|알콜솜|지퍼락|크린랩|위생팩|봉투|박스테이프|뽁뽁이|에어캡|택배박스')],
    ['식품', '간식·과자', R('프링글스|오레오|칙촉|빈츠|고래밥|꼬깔콘|썬칩|오징어집|맛동산|에이스~|참크래커|ABC초콜릿|가나~|킨더|허쉬|m&m|트윅스|스니커즈\\s*초|로아커|버터와플|다이제|촉촉한|쫀득|누가|강정|뻥튀기|누룽지|군고구마|말랭이|건조과일|요거트볼|젤리밥', 'i')],
    ['식품', '음료', R('코카콜라|스프라이트|밀키스|웰치스|데미소다|게토|비락|쿨피스|봉봉|갈아만든|자연은|델몬트|미닛메이드|썬키스트|홍초|흑초|콤부차|티젠|비타민\\s*음료|헛개수|17차|광동\\s*옥수수|하늘보리|블랙보리|새싹보리')],
    ['식품', '가공식품', R('비비고|청정원|오뚜기|CJ~|풀무원|동원|사조|대상~|농심|삼양|팔도|하림|목우촌|노브랜드|피코크|곰곰|탐사|오늘좋은|5K프라이스|이마트|홈플러스|롯데마트|컬리|국산|국내산|수입산|냉장|냉동|무항생제|유기농|친환경|HACCP|kg~|\\d+g~', 'i')],
    ['식품', '선물·기타식품', R('선물세트|명절|추석|설\\s*선물|한과|정과|식품|먹거리|간식\\s*세트|과일\\s*세트')],
  ];
  // 쇼핑 검색 결과가 알려준 분류(네이버 카테고리) → 내 분류. 사전에 없는 상품도 AI 없이 분류
  const SHOPCAT = [[/식품|농산물|축산|수산|음료|건강식품/, '식품', '식품'], [/출산|육아|유아/, '육아', '육아용품'], [/화장품|미용|뷰티/, '뷰티', '화장품'], [/반려|애완/, '반려동물', '반려동물'], [/디지털|가전|컴퓨터|휴대폰|카메라/, '가전·디지털', '가전·디지털'], [/주방/, '주방', '주방용품'], [/패션|의류|잡화|신발|가방|쥬얼리/, '패션', '패션'], [/스포츠|레저|캠핑|자동차/, '캠핑·레저', '캠핑·레저'], [/생활|건강|가구|인테리어|문구|완구/, '생활용품', '세탁·청소·생활']];
  function shopCat(c) { if (!c) return null; const s = String(c); for (const [re, m, sub] of SHOPCAT) if (re.test(s.split('>')[0]) || re.test(s)) return { main: m, sub: /건강식품/.test(s) ? '영양제' : sub, main2: /건강식품/.test(s) ? '영양제' : m }; return null; }
  const MAIN = ['식품', '영양제', '생활용품', '육아', '반려동물', '뷰티', '주방', '패션', '캠핑·레저', '가전·디지털', '기타'];
  const COLORS = { '식품': '#FF7A45', '영양제': '#9B59F6', '생활용품': '#3B82F6', '육아': '#F472B6', '반려동물': '#B45309', '뷰티': '#EC4899', '주방': '#14B8A6', '패션': '#111827', '캠핑·레저': '#16A34A', '가전·디지털': '#64748B', '기타': '#C4C2BC' };
  function categorize(name, override) {
    if (override) { const [m, s] = String(override).split('/'); return { main: m, sub: s || m }; }
    const n = String(name || '');
    for (const [m, s, re] of DICT) if (re.test(n)) return { main: m, sub: s };
    return { main: '기타', sub: '기타' };
  }

  // 상품명에서 용량·개수: "200ml* 4입" "3kg" "2.0kg" "30m 30롤" "100g 6개" "80ml*10" "600g x 4팩"
  function sizeOf(name) {
    const n = String(name || '').replace(/,/g, '');
    const m = n.match(/(\d+(?:\.\d+)?)\s*(kg|g|mg|ml|mL|l|L|리터)(?![a-z])/i);
    let amt = null, unit = null;
    if (m) { amt = +m[1]; const u = m[2].toLowerCase(); if (u === 'kg') { amt *= 1000; unit = 'g'; } else if (u === 'g') unit = 'g'; else if (u === 'mg') { amt /= 1000; unit = 'g'; } else if (u === 'ml') unit = 'ml'; else { amt *= 1000; unit = 'ml'; } }
    let cnt = 1; const c = n.match(/(?:[x×*]\s*(\d{1,3})(?:\s*(?:개|입|팩|봉|병|캔|롤|매|구|포))?)|(\d{1,3})\s*(?:개입|개|입|팩|봉|병|캔|롤|매|구|포|정|캡슐)(?![가-힣])/);
    if (c) cnt = +(c[1] || c[2]);
    if (!unit) return cnt > 1 ? { amt: cnt, unit: '개', cnt, total: cnt } : null;
    return { amt, unit, cnt, total: amt * cnt };
  }
  // 단위가격: 100g·100ml당, 개수만 있으면 1개당
  function unitPrice(name, price, qty) {
    const s = sizeOf(name); if (!s || !price) return null;
    const tot = s.total * (qty || 1), per = s.unit === '개' ? 1 : 100;
    return { value: Math.round(price / tot * per), label: s.unit === '개' ? '1개당' : `100${s.unit}당`, size: s };
  }

  const ym = d => d.slice(0, 7);
  const addM = (k, n) => { const [y, m] = k.split('-').map(Number); const d = new Date(Date.UTC(y, m - 1 + n, 1)); return d.toISOString().slice(0, 7); };
  const sum = a => a.reduce((x, y) => x + y, 0);

  /** orders → 대시보드 데이터 */
  const day = d => Math.round(new Date(d + 'T00:00:00Z').getTime() / 864e5);
  function insights(orders, opts) {
    opts = opts || {}; const today = opts.today || new Date().toISOString().slice(0, 10), cats = opts.cats || {}, L = root.LetsBuy;
    const bo = L && L.backouts ? L.backouts(orders.filter(o => o && o.date && o.date <= today)) : { removed: [] };
    const os = (L ? L.dedupe(orders) : orders).filter(o => o.date && o.date <= today);
    const groups = L ? L.group(os, opts.aliases) : os.map(o => ({ key: o.name, list: [o], alias: o.name }));
    const catOfKey = {}, rows = [];
    const pr = opts.prices || {};
    for (const g of groups) { const nm = g.list[g.list.length - 1].name; let c = categorize(nm, cats[g.key]);
      if (c.main === '기타') { const pe = pr[g.key] || pr[nm] || [], sc = shopCat((pe.find(x => x.cat) || {}).cat); if (sc) c = { main: sc.main2, sub: sc.sub, by: 'shop' }; } catOfKey[g.key] = c; for (const o of g.list) rows.push({ ...o, key: g.key, cat: c.main, sub: c.sub, spend: o.price || 0 }); }
    // 월별 (최근 24개월)
    const end = ym(today), months = []; for (let i = 23; i >= 0; i--) months.push(addM(end, -i));
    const monthly = months.map(m => { const r = rows.filter(o => ym(o.date) === m); return { m, spend: sum(r.map(o => o.spend)), count: r.length, orders: new Set(r.map(o => o.date + o.mall)).size }; });
    // 카테고리
    const byCat = MAIN.map(c => { const r = rows.filter(o => o.cat === c); return { cat: c, color: COLORS[c], spend: sum(r.map(o => o.spend)), count: r.length, items: new Set(r.map(o => o.key)).size }; }).filter(x => x.count);
    const subs = {}; rows.forEach(o => { const k = o.cat + '/' + o.sub; subs[k] = subs[k] || { cat: o.cat, sub: o.sub, spend: 0, count: 0 }; subs[k].spend += o.spend; subs[k].count++; });
    // 쇼핑몰
    const mallMap = {}; rows.forEach(o => { const m = mallMap[o.mall] = mallMap[o.mall] || { mall: o.mall, spend: 0, count: 0 }; m.spend += o.spend; m.count++; });
    // 시즌 히트맵: 대분류·소분류 × 1~12월 (구매 건수)
    const heatCats = Object.values(subs).sort((a, b) => b.count - a.count).slice(0, 12);
    const heat = heatCats.map(s => ({ label: s.sub, cat: s.cat, color: COLORS[s.cat], v: Array.from({ length: 12 }, (_, i) => rows.filter(o => o.sub === s.sub && o.cat === s.cat && +o.date.slice(5, 7) === i + 1).length) }));
    // 장바구니(같은 날·같은 쇼핑몰 = 한 주문)
    const baskets = {}; rows.forEach(o => { const k = o.orderNo || o.date + o.mall; baskets[k] = (baskets[k] || 0) + o.spend; });
    const bv = Object.values(baskets).filter(v => v > 0);
    // 전년 비교: 최근 12개월 vs 그 전 12개월
    const cur = monthly.slice(12), prev = monthly.slice(0, 12);
    const yoy = { cur: sum(cur.map(m => m.spend)), prev: sum(prev.map(m => m.spend)), curN: sum(cur.map(m => m.count)), prevN: sum(prev.map(m => m.count)) };
    yoy.pct = yoy.prev ? Math.round((yoy.cur - yoy.prev) / yoy.prev * 100) : null;
    const c0 = months[12], catYoy = byCat.map(c => { const a = sum(rows.filter(o => o.cat === c.cat && ym(o.date) >= c0).map(o => o.spend)), b = sum(rows.filter(o => o.cat === c.cat && ym(o.date) < c0 && ym(o.date) >= months[0]).map(o => o.spend)); return { cat: c.cat, color: c.color, cur: a, prev: b, pct: b ? Math.round((a - b) / b * 100) : null }; });
    // 피크 달
    const peaks = monthly.filter(m => m.spend).slice().sort((a, b) => b.spend - a.spend).slice(0, 3);
    const moy = Array.from({ length: 12 }, (_, i) => ({ mo: i + 1, spend: sum(rows.filter(o => +o.date.slice(5, 7) === i + 1).map(o => o.spend)), count: rows.filter(o => +o.date.slice(5, 7) === i + 1).length }));
    // 많이 산 품목
    const items = groups.map(g => { const l = g.list.slice().sort((a, b) => a.date < b.date ? -1 : 1); return { key: g.key, name: l[l.length - 1].name, cat: catOfKey[g.key].main, sub: catOfKey[g.key].sub, count: new Set(l.map(o => o.date)).size, spend: sum(l.map(o => o.price || 0)), img: (l.slice().reverse().find(o => o.img) || {}).img || null, dates: [...new Set(l.map(o => o.date))], list: l }; });
    const top = items.slice().sort((a, b) => b.count - a.count || b.spend - a.spend).slice(0, 12);
    const topSpend = items.slice().sort((a, b) => b.spend - a.spend).slice(0, 8);
    // 가격 변화·슈링크플레이션 (내가 낸 가격 기준)
    const changes = [];
    for (const it of items) {
      const l = it.list.filter(o => o.price); if (l.length < 3) continue;
      const first = l[0], last = l[l.length - 1]; if (first.date === last.date) continue;
      const u0 = unitPrice(first.name, first.price, first.qty), u1 = unitPrice(last.name, last.price, last.qty);
      const p0 = first.price / (first.qty || 1), p1 = last.price / (last.qty || 1);
      const s0 = sizeOf(first.name), s1 = sizeOf(last.name);
      const shrink = s0 && s1 && s0.unit === s1.unit && s1.total < s0.total && p1 >= p0 * 0.95 ? Math.round((1 - s1.total / s0.total) * 100) : 0;
      changes.push({ key: it.key, name: it.name, img: it.img, cat: it.cat, from: first.date, to: last.date, p0: Math.round(p0), p1: Math.round(p1), pct: Math.round((p1 - p0) / p0 * 100), unitPct: u0 && u1 && u0.label === u1.label ? Math.round((u1.value - u0.value) / u0.value * 100) : null, shrink, s0, s1 });
    }
    // 시장가 비교(확장이 내 브라우저에서 모은 오늘 최저가): 작년 이맘때 낸 가격 vs 지금
    const market = [];
    const prices = opts.prices || {};
    for (const it of items) {
      const pk = prices[it.key] ? it.key : Object.keys(prices).find(k => it.name.includes(k) || k.includes(it.name)); const p = pk && prices[pk]; if (!p || !p.length) continue;
      const lastDay = p.reduce((m, x) => x.date > m ? x.date : m, ''), bySrc = {};
      for (const x of p) { if (day(lastDay) - day(x.date) > 3) continue; const k = x.src || String(x.mall || '').replace(/\s*최저$/, ''); if (!bySrc[k] || x.date >= bySrc[k].date) bySrc[k] = { src: k, price: x.price, title: x.title, date: x.date }; }
      const srcs = Object.values(bySrc).sort((a, b) => a.price - b.price); if (!srcs.length) continue; const now = srcs[0];
      const yearAgo = addM(ym(today), -12), near = it.list.filter(o => o.price && Math.abs((+o.date.slice(0, 4) * 12 + +o.date.slice(5, 7)) - (+yearAgo.slice(0, 4) * 12 + +yearAgo.slice(5, 7))) <= 2);
      const ref = (near.length ? near : it.list.filter(o => o.price)).slice(-1)[0]; if (!ref) continue;
      const paid = Math.round(ref.price / (ref.qty || 1));
      const withT = srcs.find(x => x.title && sizeOf(x.title)), s0 = sizeOf(ref.name), s1 = withT && sizeOf(withT.title);
      const u0 = unitPrice(ref.name, paid, 1), u1 = withT ? unitPrice(withT.title, withT.price, 1) : unitPrice(ref.name, now.price, 1);
      const shrink = s0 && s1 && s0.unit === s1.unit && s1.total < s0.total ? Math.round((1 - s1.total / s0.total) * 100) : 0;
      const ds = it.dates.slice().sort(), gap = ds.length > 1 ? Math.round((day(ds[ds.length - 1]) - day(ds[0])) / (ds.length - 1)) : null;
      market.push({ key: it.key, name: it.name, img: it.img, cat: it.cat, paid, paidDate: ref.date, now: now.price, nowSrc: now.src, nowDate: now.date, sources: srcs, pct: Math.round((now.price - paid) / paid * 100), unitPct: u0 && u1 && u0.label === u1.label ? Math.round((u1.value - u0.value) / u0.value * 100) : null, unitLabel: u1 && u1.label, shrink, s0, s1, gap, yearAgo: !!near.length });
    }
    const out = { today, months, monthly, byCat, subs: Object.values(subs).sort((a, b) => b.spend - a.spend), malls: Object.values(mallMap).sort((a, b) => b.spend - a.spend), heat, basket: { avg: bv.length ? Math.round(sum(bv) / bv.length) : 0, n: bv.length, max: bv.length ? Math.max(...bv) : 0 }, yoy, catYoy, peaks, moy, top, topSpend, items, changes: changes.filter(c => Math.abs(c.pct) <= 100).sort((a, b) => (b.shrink > 0) - (a.shrink > 0) || Math.abs(b.pct) - Math.abs(a.pct)), shrink: changes.filter(c => c.shrink > 0), market: market.sort((a, b) => b.pct - a.pct), total: { backN: bo.removed.length, backSpend: sum(bo.removed.map(o => o.price || 0)), spend: sum(rows.map(o => o.spend)), count: rows.length, items: items.length, priced: rows.filter(o => o.spend).length }, catOfKey };
    out.notes = notesOf(out, rows); return out;
  }
  const short = n => { n = String(n).replace(/\[[^\]]*\]|\([^)]*\)/g, ' ').trim(); const w = n.split(/\s+/); return w.slice(0, 3).join(' ').slice(0, 16); };
  const man = n => n >= 1e4 ? Math.round(n / 1e4).toLocaleString() + '만원' : Math.round(n).toLocaleString() + '원';
  const sg = p => (p > 0 ? '+' : '') + p + '%';
  function notesOf(A, rows) {
    const N = [];
    if (A.yoy.pct != null && A.yoy.prev) N.push({ icon: 'wallet', tone: A.yoy.pct > 0 ? 'up' : 'down', big: sg(A.yoy.pct), text: '작년보다 지출' });
    const pk = A.peaks[0]; if (pk) { const r = rows.filter(o => ym(o.date) === pk.m), bc = {}; r.forEach(o => bc[o.sub] = (bc[o.sub] || 0) + o.spend); const top = Object.entries(bc).sort((a, b) => b[1] - a[1])[0]; N.push({ icon: 'flame', tone: 'hot', big: `${pk.m.slice(2, 4)}년 ${+pk.m.slice(5)}월`, text: `가장 많이 쓴 달${top ? ' · ' + top[0] + ' 최다' : ''}`, m: pk.m }); }
    const cy = A.catYoy.filter(c => c.pct != null && c.prev >= 30000).sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))[0]; if (cy) N.push({ icon: 'swap', tone: cy.pct > 0 ? 'up' : 'down', big: sg(cy.pct), text: `${cy.cat} 지출 작년 대비`, cat: cy.cat });
    const sea = A.heat.map(h => { const t = h.v.reduce((a, b) => a + b, 0), mx = Math.max(...h.v); return { h, t, mx, mo: h.v.indexOf(mx) + 1, c: t ? mx / t : 0 }; }).filter(x => x.t >= 4).sort((a, b) => b.c - a.c)[0];
    if (sea && sea.c >= 0.2) N.push({ icon: 'calendar', tone: 'hot', big: `${sea.mo}월`, text: `${sea.h.label} 가장 많이 사는 달`, cat: sea.h.cat });
    const mk = A.market.filter(m => m.yearAgo).sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))[0] || A.market[0];
    if (mk) N.push({ icon: 'tag', tone: mk.pct > 0 ? 'up' : 'down', big: sg(mk.pct), text: `${short(mk.name)} · 작년 ${man(mk.paid)} → ${mk.nowSrc} ${man(mk.now)}`, key: mk.key, img: mk.img });
    else { const ch = A.changes.filter(c => !c.shrink)[0]; if (ch) N.push({ icon: 'tag', tone: ch.pct > 0 ? 'up' : 'down', big: sg(ch.pct), text: `${short(ch.name)} 내가 낸 가격`, key: ch.key, img: ch.img }); }
    const sh = A.market.find(m => m.shrink) || A.shrink[0]; if (sh) N.push({ icon: 'alert', tone: 'warn', big: `용량 −${sh.shrink}%`, text: `${short(sh.name)} 슈링크플레이션 의심`, key: sh.key, img: sh.img });
    const ml = A.malls[0], tot = A.total.spend; if (ml && tot) N.push({ icon: 'store', tone: '', big: Math.round(ml.spend / tot * 100) + '%', text: `${ml.mall}에서 산 비율`, mall: ml.mall });
    const ct = A.byCat.slice().sort((a, b) => b.spend - a.spend)[0]; if (ct && tot) N.push({ icon: 'pie', tone: '', big: Math.round(ct.spend / tot * 100) + '%', text: `${ct.cat}에 쓴 비율`, cat: ct.cat });
    if (A.total.backN) N.push({ icon: 'cycle', tone: '', big: man(A.total.backSpend), text: `취소·반품 ${A.total.backN}건 지출에서 뺌` });
    return N.slice(0, 8);
  }
  const api = { DICT, MAIN, COLORS, categorize, sizeOf, unitPrice, insights };
  if (typeof module !== 'undefined') module.exports = api; else root.LetsBuyInsights = api;
})(typeof window !== 'undefined' ? window : globalThis);
