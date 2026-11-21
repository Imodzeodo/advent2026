// 좌표는 [동서, 남북]. 북쪽 건물 앞에도 걸어서 닿을 공간을 남긴다.
(function () {
  const route = {
    '1-0': ['temple', '밤의 성전 뜰', 'night', 3],
    '1-1': ['roof', '사가랴 집 지붕', 'dawn', 0],
    '1-2': ['temple', '제비를 뽑는 뜰', 'dawn', 1],
    '1-3': ['sanctuary', '향단 앞', 'night', 0],
    '1-4': ['temple', '성전 돌계단', 'dusk', 2, 'crowd'],
    '1-5': ['hillpath', '산골로 돌아가는 길', 'dusk', 0],
    '1-6': ['roof', '별을 보는 지붕', 'dawn', 1],
    '2-0': ['hillpath', '광야 길', 'dusk', 2, 'dry'],
    '2-1': ['nazareth', '나사렛 골목', 'dusk', 0],
    '2-2': ['workshop', '요셉의 작업장', 'night', 0],
    '2-3': ['workshop', '밤의 작업장', 'night', 2],
    '2-4': ['galilee', '갈릴리 언덕', 'dawn', 1],
    '2-5': ['nazareth', '나사렛 혼인 행렬', 'dawn', 3, 'wedding'],
    '2-6': ['well', '마을 우물', 'dusk', 2],
    '3-0': ['nazareth', '마리아의 집 앞', 'dusk', 1],
    '3-1': ['well', '맑은 물이 있는 우물', 'dusk', 0],
    '3-2': ['hillpath', '산골집으로 가는 길', 'dusk', 0],
    '3-3': ['elizabeth', '엘리사벳 집 마당', 'night', 1],
    '3-4': ['galilee', '노래가 닿는 언덕', 'dawn', 2],
    '3-5': ['elizabeth', '엘리사벳의 포도밭', 'dawn', 0],
    '3-6': ['elizabeth', '요한의 집 잔치', 'dawn', 3, 'feast'],
    '4-0': ['gate', '다윗의 동네 성문', 'dusk', 0],
    '4-1': ['inn', '베들레헴 여관 골목', 'night', 0],
    '4-2': ['field', '새끼 양이 숨은 들판', 'dusk', 0],
    '4-3': ['field', '목자들의 모닥불', 'night', 2],
    '4-4': ['stable', '빛이 새는 마구간', 'night', 0],
    end: ['stable', '큰 별 아래 구유', 'night', 2]
  };
  const zachariahLater = [
    ['1-4', '말을 잃었소. 그래도 하나님은 들으셨소.', '사가랴의 서판'],
    ['3-6', '이제 말할 수 있다! {양}도 잘 크는구나.', '사가랴']
  ];
  const people = {
    zachariah: ['사가랴', [
      [null, '오늘 분향할 제사장을 제비로 뽑는단다. 사십 년 기다린 날이 올까?'],
      ['1-2', '성소 안에서… 아니, 아직 말할 수 없구나.'],
      ...zachariahLater
    ]],
    incenseZachariah: ['사가랴', [
      [null, '향단 앞에 서니 손이 떨리는구나. 밖에서는 백성들이 기도하고 있단다.'],
      ['1-3', '천사가… 내 기도가 들렸다고 했다. 이 나이에, 정말일까.'],
      ...zachariahLater
    ]],
    templeWitness: ['기다리는 사람', [
      [null, '제사장이 왜 이렇게 안 나오지? 무슨 일이 생긴 걸까?'],
      ...zachariahLater
    ]],
    joseph: ['요셉', [
      [null, '결혼할 집을 짓는 중이야. 문틀이 삐뚤면 안 되지.'],
      ['2-1', '…요즘 생각이 많아. 대패질이 손에 안 잡히네.'],
      ['2-3', '꿈에서 들은 말씀대로 할 거야. 무서워도.'],
      ['2-5', '마리아를 데려왔어. 이 집이 이제 우리 집이야.']
    ]],
    elizabeth: ['엘리사벳', [
      [null, '다섯 달은 조용히 지내려고요. 하나님이 하신 일을 먼저 누리고 싶어서.'],
      ['3-3', '마리아 목소리를 듣자 아기가 배 속에서 뛰놀았어요!'],
      ['3-6', '이름은 요한! 하나님은 은혜로우시다.']
    ]],
    mary: ['마리아', [
      [null, '오늘따라 우물 물이 유난히 맑아요. 꼭 무슨 일이 생길 것 같은 날이에요.'],
      ['3-1', '말씀대로 내게 이루어지기를. 그 말, 아직도 떨려요.']
    ]],
    elder: ['목자 할아버지', [
      [null, '오늘 밤은 이상하게 맑구나. {양}, 불 가까이 와라.'],
      ['4-4', '천사들의 노래… 너도 들었지?']
    ]],
    innkeeper: ['여관 주인', [
      [null, '손님 받을 방이 있냐고? 오늘은 그럭저럭.'],
      ['4-1', '방 없어요! 진짜 없다니까요! …저기 마구간이라도 괜찮으면…']
    ]]
  };
  // kind, 활동 제목, 비밀, 한정 장식. 대사는 아래 cues에서 같은 편에 붙는다.
  const daily = {
    '1-0': ['light', '문지기의 등불', '성벽 틈의 작은 등잔', '등불 목걸이'],
    '1-1': ['find', '바람에 날린 기도 쪽지', '지붕 아래 비둘기 둥지'],
    '1-2': ['follow', '비둘기 떼 따라가기', '기둥 뒤 제비 돌', '흰 깃털 핀'],
    '1-3': ['follow', '향 연기 따라가기', '휘장 옆 빛'],
    '1-4': ['timed', '군중 속 아이 셋', '계단 밑 그늘'],
    '1-5': ['find', '바람에 날아간 서판 조각', '올리브 고목 구멍'],
    '1-6': ['order', '기다린 사람들의 별', '굴뚝 옆 새벽 별'],
    '2-0': ['clear', '광야 길의 돌 치우기', '메마른 샘', '목자 지팡이'],
    '2-1': ['meet', '같은 일, 다른 세 이야기', '골목 끝 무화과'],
    '2-2': ['deliver', '나무 조각 셋', '작업대 밑', '나무 뿔 장식'],
    '2-3': ['follow', '꿈속 별빛 따라가기', '지붕 위'],
    '2-4': ['timed', '올리브 다섯 알', '언덕 너머 호수 전망'],
    '2-5': ['light', '행렬 등불과 꽃잎', '혼인 집 뒷마당', '혼인 꽃 화관'],
    '2-6': ['deliver', '물동이 세 번 나르기', '우물 바닥 반짝임'],
    '3-0': ['find', '빛 깃털 세 개', '뒤뜰 무화과'],
    '3-1': ['find', '물에 비친 별 세 개', '우물 옆 돌계단'],
    '3-2': ['timed', '산골길을 달려', '지름길'],
    '3-3': ['deliver', '아기 옷 털실', '창가 요람', '흰 꽃 화관'],
    '3-4': ['order', '노래를 닮은 종', '바위 위 별자리', '종이 별 모자'],
    '3-5': ['find', '포도송이 다섯', '포도주 틀'],
    '3-6': ['deliver', '그 이름은 요한', '잔칫상 밑'],
    '4-0': ['follow', '호적 줄 사이로', '성문 위 망루', '은 왕관'],
    '4-1': ['meet', '여관 문 네 개 두드리기', '마구간 뒤 길'],
    '4-2': ['hide', '풀숲의 새끼 양', '큰 바위 뒤 샘', '작은 날개'],
    '4-3': ['guard', '모닥불 지키기', '언덕 위 망대'],
    '4-4': ['light', '별빛 길의 등불', '마구간 지붕 위 큰 별'],
    end: ['meet', '큰 별 아래 구유', null, '금빛 천사 날개']
  };
  const cues = {
    '1-0': {
      who: '성전 문지기', lines: [[null, '밤새 문을 지키는데 등불 기름이 다 떨어졌구나.']],
      intro: '뜰에 꺼진 등잔이 네 개 있단다. {양}이랑 등잔 곁으로 가 보렴.',
      done: '깨어 있는 사람에게는 늘 빛이 있단다. 고맙다, {이름}.',
      pieces: ['서쪽 기둥 등잔', '동쪽 기둥 등잔', '계단 등잔', '뜰 입구 등잔'], symbol: '🪔'
    },
    '1-1': {
      who: '엘리사벳', lines: [[null, '바람이 꽤 세구나. 이 양반 떠나기 전에 지붕을 한 번 둘러봐 주렴.']],
      intro: '기도를 적어 둔 쪽지 세 장이 바람에 날아갔어. 글은 그대로 두고 쪽지만 가져오렴.',
      done: '고마워. 사가랴가 성전에 가면 이 마음도 함께 들고 갈 거야.',
      pieces: ['난간에 걸린 쪽지', '등잔 옆 쪽지', '계단 모서리 쪽지'], symbol: '📄', replayTime: 30
    },
    '1-2': {
      person: 'zachariah', intro: '저 비둘기들이 어디로 가는지 {양}이랑 따라가 보렴.',
      done: '비둘기가 날아간 자리에 흰 깃털이 남았어.',
      pieces: ['흰 비둘기', '떼가 머문 곳', '흰 깃털'], symbol: '🕊', extraVerse: '말 3:1'
    },
    '1-3': {
      person: 'incenseZachariah', intro: '향이 피어오른다. 연기가 흘러가는 쪽으로 걸어가 봐.',
      done: '연기가 가늘어지며 빛이 스며들었어.',
      pieces: ['향단의 연기', '기둥 사이 연기', '빛이 닿은 곳'], symbol: '〰'
    },
    '1-4': {
      person: 'templeWitness', who: '기다리던 사람', intro: '사람들 사이에 아이 셋이 숨어 있어. 30초 안에 찾아 볼래?',
      done: '찾았다! 이제 여기서 다 같이 기다리면 되겠다.',
      pieces: ['계단 곁 아이', '뒤쪽 아이', '기둥 곁 아이'], symbol: '👀', time: 30, hidden: true
    },
    '1-5': {
      who: '사가랴의 서판', lines: [[null, '집에. 이제 돌아왔소.'], ['1-5', '이번엔. 같이 기다립시다.']],
      intro: '서판 셋으로 갈라졌소. 산골길을 함께 살펴보겠소?',
      done: '하나님은 은혜로우시다',
      pieces: ['올리브 아래 조각', '돌담 곁 조각', '비탈길 조각'], symbol: '▰'
    },
    '1-6': {
      who: '엘리사벳', lines: [[null, '여긴 밤이면 아주 조용해. {양}하고 별을 보고 가렴.'],
        ['1-6', '다섯 달은 조용히 지내려고요. 하나님이 하신 일을 먼저 누리고 싶어서.']],
      intro: '지난 이야기부터 하나씩 떠올려 봐. 아브라함, 다윗, 그리고 오늘.',
      done: '그 긴 기다림 끝에, 우리 차례가 온 거네요.',
      pieces: ['아브라함', '다윗', '오늘'], symbol: '✦'
    },
    '2-0': { pieces: ['길 입구 바위', '큰 돌', '길 가운데 돌', '모난 돌', '마지막 돌'], symbol: '🪨' },
    '2-1': { person: 'joseph', pieces: ['이웃', '마을 아이', '우물가 사람'],
      pieceLines: ['요셉이 오늘 작업장 문을 일찍 닫았대.', '망치를 놓고 골목을 한동안 걷더라.', '왜 그런지는 요셉에게 직접 물어봐.'] },
    '2-2': {
      person: 'joseph', intro: '바람에 대패 밥이랑 나무 조각이 마을에 흩어졌어. 세 개만 찾아 줄래?',
      pieces: ['작업대 옆', '장작 더미 앞', '담장 옆'], symbol: '🪵',
      done: '솜씨 좋은데? 이걸로 {양} 장식 하나 깎아 줄게.'
    },
    '2-3': { person: 'joseph', pieces: ['첫 별빛', '창밖의 빛', '마당 끝 별빛'], symbol: '✦' },
    '2-4': { pieces: ['올리브 하나', '올리브 둘', '올리브 셋', '올리브 넷', '올리브 다섯'], time: 40 },
    '2-5': { person: 'joseph', pieces: ['대문의 등불', '골목의 꽃잎', '행렬 끝 등불'], symbol: '🪔', petals: 1 },
    '2-6': { pieces: ['첫 물동이', '둘째 물동이', '마지막 물동이'], courier: true, symbol: '🏺' },
    '3-0': { person: 'mary', pieces: ['집 앞 깃털', '돌담의 깃털', '나무 아래 깃털'], symbol: '🪶' },
    '3-1': { person: 'mary', pieces: ['우물 입구 별', '물동이 곁 별', '물에 비친 별'], symbol: '✦', extraVerse: '사 7:14' },
    '3-2': { pieces: ['산골길 입구', '비탈길', '산골길 끝'], time: 45, ordered: true },
    '3-3': {
      person: 'elizabeth', intro: '아기 옷을 짜고 있는데 털실이 모자라요. {양} 털 세 뭉치만 나눠 줄래요?',
      done: '따뜻하겠다! 답례로 이거 받아요.', wool: 3, button: '털 3뭉치 주기'
    },
    '3-4': { pieces: ['낮은 종', '가운데 종', '높은 종'], symbol: '🔔' },
    '3-5': { pieces: ['붉은 포도', '보라 포도', '둥근 포도', '그늘의 포도', '돌담의 포도'], symbol: '🍇' },
    '3-6': { person: 'elizabeth', pieces: ['잔칫상의 서판'], symbol: '▰', done: '이름은 요한! 하나님은 은혜로우시다.' },
    '4-0': { person: 'elder', pieces: ['성문 입구', '호적을 적는 곳', '열린 길'] },
    '4-1': { person: 'innkeeper', pieces: ['낮은 문', '등불 달린 문', '돌문', '골목 끝 문'],
      pieceLines: ['방 없어요.', '오늘은 자리가 다 찼어.', '방 없어요!', '…저기 마구간이라도 괜찮으면…'],
      done: '골목 끝에 마구간으로 가는 길이 보여.' },
    '4-2': {
      person: 'elder', intro: '새끼 양이 안 보인다. 덤불 사이를 잘 봐 주렴.',
      done: '아흔아홉 마리를 두고서라도 찾는 거란다.',
      pieces: ['서쪽 덤불', '멀리 있는 덤불', '동쪽 덤불'], hidden: true, symbol: '🌿'
    },
    '4-3': { person: 'elder', pieces: ['장작 하나', '장작 둘', '장작 셋'], symbol: '🪵' },
    '4-4': { person: 'elder', pieces: ['첫 별빛 등불', '두 번째 등불', '마구간 문 앞'], symbol: '🪔', extraVerse: '눅 2:10-11' },
    end: { person: 'elder', manger: true, extraVerse: '눅 2:7' }
  };
  const positions = [[-4.8, 2.8], [4.5, .3], [3.3, -4], [-2.1, -3.6], [-5.1, -.6]];
  const secretPos = [[-7.6, -1.8], [7.3, 3.0], [-7.4, 6.4], [7.35, -2.65]];
  const secrets = {
    '1-0': '돌 사이로 작은 등잔 하나가 깜빡이고 있어.',
    '1-1': '지붕 아래 마른 가지로 엮은 작은 둥지가 보여.',
    '1-2': '기둥 뒤에서 손톱만 한 제비 돌을 찾았어.',
    '1-3': '휘장 사이로 가느다란 빛이 새고 있어.',
    '1-4': '떠드는 소리가 멀어지는 조용한 틈이야.',
    '1-5': '나무 구멍 안에 오래된 잎이 한 장 들어 있어.',
    '1-6': '해가 오르기 전, 가장 오래 남아 있는 별이야.'
  };
  const region = ep => ep.ch === 1 ? (['1-1', '1-5', '1-6'].includes(ep.id) ? 1 : 0) :
    ep.ch === 2 || ['3-0', '3-1', '3-4'].includes(ep.id) ? 2 : ep.ch === 3 ? 1 : 3;
  window.EXPLORE = Object.fromEntries(window.EPISODES.filter(ep => route[ep.id]).map((ep, index) => {
    const [kit, title, time, angle, variant] = route[ep.id];
    const [kind, activityTitle, secret, exclusive] = daily[ep.id];
    const cue = cues[ep.id] || {};
    const [name, lines] = people[cue.person] || [cue.who || ep.host, [[null, '여기까지 걸어왔구나. {양}과 함께 둘러보고 가.']]];
    const peopleMarker = { id: 'person', type: 'person', name, title: name, pos: [-4.2, -2.75], lines: cue.lines || lines };
    const word = { id: 'word', type: 'verse', pos: [-1.4, 1.05], title: '말씀 비석', ref: ep.card.key };
    const photo = { id: 'photo', type: 'photo', pos: [4.95, 3.8], title: '포토 스팟' };
    const markers = [peopleMarker, { id: 'activity', type: 'quest', pos: [2.4, -1.8], title: activityTitle, name: cue.who || name }, word, photo];
    if (cue.extraVerse && cue.extraVerse !== ep.card.key) markers.push({ ...word, id: 'extra-word', title: '말씀 · ' + cue.extraVerse, extra: true, pos: [5.45, -4.15], ref: cue.extraVerse });
    if (secret) markers.push({ id: 'secret', type: 'secret', title: secret, pos: secretPos[(index * 3 + angle) % secretPos.length], text: secrets[ep.id] });
    const activity = { kind, title: activityTitle, exclusive, ...cue,
      pieces: (cue.pieces || []).map((piece, n) => ({
        title: piece, pos: positions[n], symbol: n === cue.petals ? '🌸' : cue.symbol, text: cue.pieceLines?.[n]
      })) };
    return [ep.id, { kit, title, openHour: ep.openHour, seed: +(ep.date.replace(/-/g, '')), layout: { time, angle, variant }, region: region(ep), activity, markers }];
  }));
})();
