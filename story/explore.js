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
    '3-3': ['elizabeth', '엘리사벳 집 마당', 'night', 1, 'courtyard'],
    '3-4': ['galilee', '노래가 닿는 언덕', 'dusk', 2, 'summit'],
    '3-5': ['elizabeth', '엘리사벳의 포도밭', 'dawn', 0, 'vineyard'],
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
    '2-0': {
      who: '요셉', lines: [[null, '{이름}, 발밑 조심해. 이쪽 길엔 모난 돌이 많아.'],
        ['2-0', '문틀도 길도 손을 대야 곧아지더라. 내가 할 몫부터 해 보려고.']],
      intro: '길 한복판에 돌이 다섯 개나 있어. 돌마다 두 번 톡 눌러서 길 가장자리로 굴려 보자.',
      done: '이제 발에 걸리는 게 없네. {양}도 이 길로 편히 지나가겠다.',
      pos: [-2, 4.3], pieces: [
        ['입구의 돌', [0, 3.2]], ['비스듬히 박힌 돌', [.8, 1.3]], ['길 가운데 돌', [1.8, -.7]],
        ['모난 돌', [1.2, -2.8]], ['고개 앞 돌', [-.7, -4.9]]
      ], symbol: '🪨', secret: [[6.4, -3.7], '바싹 마른 돌 테두리 안에 물이 차던 자국이 남아 있어.']
    },
    '2-1': {
      who: '요셉', lines: [[null, '어제 마리아가 할 말이 있다고 했어. 아직도 그 표정이 마음에 걸려.'],
        ['2-1', '마리아가 거짓말할 사람은 아니야. 아직 마음이 복잡해서 오늘은 대패를 내려놨어.']],
      intro: '오늘 목공소가 왜 조용한지, 골목 사람 셋에게 물어봐. 같은 일을 보고도 다르게 말하더라.',
      done: '문 닫는 것만 본 사람도, 내가 걷는 걸 본 사람도 있구나. 끝까지 들어 줘서 고마워.',
      pieces: [
        ['맞은편 이웃', [-5.4, -4.6], '평소 같으면 이 시간에 대패 소리가 나. 오늘은 벌써 문을 닫았더라.'],
        ['골목 아이', [1.1, 2.3], '요셉 아저씨가 아까 여기로 두 번이나 지나갔어. 보통은 인사해 주는데 오늘은 날 못 봤나 봐.'],
        ['우물가 이웃', [5.7, .9], '나도 조용한 건 알아. 그 까닭은 요셉이 말해 줄 때까지 기다리면 어떨까?']
      ], secret: [[-7.2, .6], '골목 끝 무화과 가지가 낮게 늘어져 있어. 잎 그늘에 앉으니 발소리도 조용해져.']
    },
    '2-2': {
      who: '요셉', lines: [[null, '밤새 두루마리를 읽었어. 손에 익은 연장처럼 답도 쉽게 잡히면 좋을 텐데.'],
        ['2-2', '조용히 끝내기로 했어. 마리아를 사람들 앞에 세워 두고 싶지 않아.']],
      intro: '연장 정리하다 나무 조각을 흘렸어. 세 개를 찾아서 작업대 쪽에 있는 나한테 가져와 줄래?',
      done: '세 조각 다 찾았네. 손 가는 대로 만져 보니까 이 조각은 {양}한테 잘 어울리겠다.',
      pos: [.6, -4.3], cargo: '나무 조각', symbol: '🪵', pieces: [
        ['대팻밥 사이 조각', [3.2, -3.7]], ['장작 더미 옆 조각', [5.6, -4.8]], ['담장에 걸린 조각', [-5.2, -3.9]]
      ], secret: [[1.8, -5.4], '작업대 밑에 뿔처럼 구부러진 나무 조각 하나가 남아 있어.']
    },
    '2-3': {
      who: '요셉', lines: [[null, '등잔은 껐어. 눈만 잠깐 붙일게.'],
        ['2-3', '…꿈이었나? 내 이름을 부르던 목소리가 아직도 귀에 남아 있어.']],
      intro: '작업장 바닥에 별빛이 내려앉았어. 빛 하나가 멀어지면 다음에 멈춘 자리까지 따라가 봐.',
      done: '새벽빛이 들자 별빛이 옅어졌어. {양}의 발소리가 다시 들려.',
      pos: [-1.6, 2.8], symbol: '✦', pieces: [
        ['문턱에 내려온 별빛', [-3.5, -.4]], ['창가를 스친 별빛', [.8, -3.4]],
        ['장작 너머 별빛', [5.8, -2.8]], ['지붕 아래 새벽빛', [3.4, 1.1]]
      ], secret: [[-4.6, -6.2], '처마에 바짝 붙어서 올려다보니 지붕 위로 별빛 하나가 흘러가.', 'star']
    },
    '2-4': {
      who: '요셉', lines: [[null, '눈뜨자마자 어릴 때 회당에서 듣던 말씀이 떠올랐어. 정확히 뭐였더라.'],
        ['2-4', '임마누엘. 하나님이 우리와 함께 계신다는 뜻이야. 그 말이 오늘은 우리 집 얘기처럼 들려.']],
      intro: '언덕에 올리브가 떨어졌어. 40초 동안 나무 아래랑 비탈을 훑어서 다섯 알을 주워 보자.',
      done: '다섯 알 모두 주웠네. {이름}, 올라오는 동안 곁에 있어 줘서 좋았어.',
      pos: [-.5, 4.5], time: 40, symbol: '🫒', pieces: [
        ['그늘에 떨어진 올리브', [-5.4, 2.1]], ['풀잎 사이 올리브', [-3.9, -1.2]], ['고개 위 올리브', [-.2, -4.5]],
        ['돌 옆 올리브', [4.7, -4.4]], ['비탈 끝 올리브', [5, .2]]
      ], secret: [[6.9, -6.5], '바위 틈 너머로 갈릴리 호수가 보여. 물 위로 새벽빛이 길게 번져 있어.']
    },
    '2-5': {
      who: '요셉', lines: [[null, '마리아네까지 이 길로 가면 돼. 걸음 옮기기 전에 숨 좀 고를게.'],
        ['2-5', '마리아가 문이 곧다고 하더라. 둘이 처음으로 같이 그 문을 닫고 등잔을 켰어.']],
      intro: '골목 입구부터 대문까지 등잔을 밝히자. 길에 떨어진 흰 꽃잎도 두 장 주워 줄래?',
      done: '골목이 훤해졌네. 꽃잎은 대문 곁에 두자. 같이 걸어 줘서 고마워, {이름}.',
      pos: [-2.2, 4.4], symbol: '🪔', pieces: [
        ['골목 첫 등잔', [-3.5, 2.4]], ['돌담 아래 꽃잎', [-4.1, .1], null, '🌸', 'find'],
        ['돌담 끝 등잔', [-1.5, -1.5]], ['기둥 사이 꽃잎', [1.5, -2.5], null, '🌸', 'find'],
        ['혼인 집 대문 등잔', [4.8, -5]]
      ], secret: [[7.35, -5.9], '혼인 집 뒤쪽에 흰 꽃가지 몇 개가 남아 있어. 앞길이 소란해도 여긴 조용해.']
    },
    '2-6': {
      who: '요셉', lines: [[null, '집에 물이 떨어졌어. {양}은 우물 턱 쪽으로 너무 가까이 안 가게 봐 줘.'],
        ['2-6', '집에 오는 길에 그 이름을 또 불러 봤어. 예수. 입에 익어도 부를 때마다 마음이 달라.']],
      intro: '우물에서 한 동이씩 받아서 우리 집 문 앞에 내려놔 줘. 세 번이면 오늘 쓸 물은 넉넉해.',
      done: '물이 가득 찼네. 고마워. 새 방이 조금씩 사람 사는 집이 되어 가는구나.',
      pos: [-3.2, -2.6], gift: ['cushion', '작업장 방석'], handoff: ['요셉네 집', [.2, -6.2]], courier: true, cargo: '물동이', symbol: '🏺', pieces: [
        ['첫 물동이', [-1.7, -2.59]], ['둘째 물동이', [-1.7, -2.59]], ['마지막 물동이', [-1.7, -2.59]]
      ], secret: [[-2.86, -4.32], '우물 벽을 따라 내려다보면 물 아래에서 자갈 하나가 반짝여.']
    },
    '3-0': {
      who: '마리아', lines: [[null, '어, 등불 든 아이구나. {양}도 이리 와. 무화과 그늘은 아직 시원해.'],
        ['3-0', '은혜를 받은 자라니… 나한테 하는 인사인 거겠지? 자꾸 그 자리를 돌아보게 돼.']],
      intro: '집 앞에 빛이 내려앉은 것 같아. {양}이랑 깃털처럼 가벼운 빛 세 개를 찾아봐 줄래?',
      done: '만지니 금방 빛이 옅어지네. 저녁이 다 지나기 전에 같이 봐서 다행이야.',
      pos: [-2.7, -4.7], meetFirst: true, symbol: '🪶', pieces: [
        ['문턱에 닿은 빛 깃털', [-5.4, -5.95]], ['돌담을 넘은 빛 깃털', [-5, -.7]], ['무화과 밑 빛 깃털', [-7.3, .7]]
      ], secret: [[-7.6, -2.6], '뒤뜰 무화과 그늘에 서니 마당의 빛이 잎 사이로 조각나 보여.']
    },
    '3-1': {
      who: '마리아', lines: [[null, '물 뜨러 왔는데 가만히 서 있게 되네. 물결이 가라앉으면 물동이를 채울 거야.'],
        ['3-1', '말씀대로 해 달라고 했어. 소리 내고 나니 손은 여전히 떨렸는데, 숨은 조금 편해졌어.']],
      intro: '우물과 고인 물에 별이 하나씩 비쳐. 물가에 바짝 다가가 세 빛을 찾아봐. 고개를 숙이면 잘 보여.',
      done: '바람이 지나가니까 별이 잠깐씩 사라졌다 다시 보이네. 여기서 조금만 더 보고 가자.',
      pos: [-3.5, -4.6], symbol: '✧', pieces: [
        ['우물에 비친 별', [-1.9, -2.79], null, null, 'reflection'],
        ['물동이에 비친 별', [.9, -2.1], null, null, 'reflection'],
        ['고인 물에 비친 별', [-.4, .1], null, null, 'reflection']
      ], secret: [[-4.25, -2], '우물 옆 낮은 돌계단은 저녁 물을 길은 발자국으로 젖어 있어.']
    },
    '3-2': {
      who: '마리아', lines: [[null, '갈림길마다 어느 쪽인지 물어봤어. 저 고개만 넘으면 이 근처일 텐데.'],
        ['3-2', '드디어 언니네 문이야. 인기척이 났어. {양}, 이제 숨 좀 돌려도 되겠다.']],
      intro: '45초 안에 돌표지, 비탈 굽이, 산골집 대문 순서로 지나가자. 짐을 들고 있으니 먼저 길을 봐 줄래?',
      done: '대문이다! {이름}, 먼저 기다려 줘. 여기서 내가 문을 두드려 볼게.',
      pos: [-.3, 4.3], ordered: true, time: 45, symbol: '⚑', pieces: [
        ['갈림길 돌표지', [2.8, 2.5]], ['비탈 굽이', [3.3, -2.15]], ['산골집 대문', [.1, -6.57]]
      ], secret: [[-5.8, -1.6], '돌담 끊긴 곳에서 좁은 길이 보여. 비탈을 크게 돌지 않고 고개로 오를 수 있겠어.']
    },
    '3-3': {
      who: '엘리사벳', lines: [[null, '문밖에 누가 왔나 봐. 방에만 있었더니 반가운 발소리도 크게 들리네.'],
        ['3-3', '마리아가 인사하는데 배 속 아이가 벌떡 뛰었지 뭐니! 나도 모르게 같이 웃었단다.']],
      intro: '아기 옷에 쓸 털실을 마당에서 말리고 있었어. 세 뭉치를 거둬서 내게 가져다주렴.',
      done: '고맙다. 이 털실로 짜면 아기한테 까슬거리지 않겠어.',
      pos: [2, -5.37], cargo: '털실', symbol: '🧶', pieces: [
        ['난간의 털실', [4.9, -3.8]], ['낮은 바구니의 털실', [-3.5, -.8]], ['창 아래 털실', [-3.6, -6.1]]
      ], secret: [[2.8, -6.7], '창가에 작은 요람이 있어. 접어 둔 천 위로 창문 빛이 살짝 걸쳐.']
    },
    '3-4': {
      who: '마리아', lines: [[null, '언니랑 이야기하다 보니 가슴이 벅차. 말로 하려니까 자꾸 길어져.'],
        ['3-4', '조상들이 부르던 노래를 나도 불렀어. 하나님이 나를 보셨다는 말은 부를 때마다 좋아.']],
      intro: '종 세 개를 봐. 내가 한 소절씩 치면 그 음이 난 자리도 잠깐 빛날 거야. 같은 순서로 눌러 봐.',
      done: '마지막 음까지 이어졌어. {양}도 고개를 들었네. 여기선 작은 소리도 멀리 가나 봐.',
      pos: [0, 3.8], sequence: [1, 2, 0], symbol: '🔔', pieces: [
        ['낮은 종', [-2.9, -2.8], null, null, 'bell'], ['가운데 종', [.25, -4.4], null, null, 'bell'],
        ['높은 종', [3.6, -2.5], null, null, 'bell']
      ], secret: [[6.6, -5.7], '바위 위에 서면 나뭇가지에 가리던 별 세 개가 한꺼번에 보여.', 'star']
    },
    '3-5': {
      who: '마리아', lines: [[null, '언니가 포도 덩굴 사이로 걷는 법을 알려 줬어. 가지 밑에선 고개를 숙여야 해.'],
        ['3-5', '석 달 동안 언니한테 참 많이 배웠어. 여기서 심은 건 싹이 나는 걸 못 보고 가겠네.']],
      intro: '양쪽 포도 줄에 잘 익은 송이가 있어. 오늘 먹을 만큼만 다섯 송이 따자. 내가 바구니를 들고 갈게.',
      done: '딱 다섯 송이다. 같이 일하니까 금방이네. 그늘에 앉아서 한 송이 나눠 먹자.',
      pos: [0, 2.9], symbol: '🍇', pieces: [
        ['서쪽 첫 포도', [-5.8, 1.1]], ['서쪽 두 번째 포도', [-5.8, -2.1]],
        ['서쪽 안쪽 포도', [-6, -5]], ['동쪽 안쪽 포도', [6, -4.6]], ['동쪽 끝 포도', [5.8, -.6]]
      ], secret: [[7.2, 3.8], '돌로 된 포도주 틀에 둥근 홈이 파여 있어. 묵은 포도 향이 희미하게 남아.']
    },
    '3-6': {
      who: '엘리사벳', lines: [[null, '아기 이름을 의논하는 중이야. 저 양반도 뭐라고 쓸 게 있나 보다.'],
        ['3-6', '서판을 읽고 나서 그이 목소리를 들었어. 너무 오랜만이라 다시 부르는 줄도 몰랐지.']],
      intro: '사가랴가 서판을 달라고 손짓하는구나. 상 위에 놓인 서판을 그이한테 건네주겠니?',
      done: '그 이름은 요한. …주님, 찬송합니다!',
      pos: [-1.1, 1.5], gift: ['swaddle', '아기 포대기'], handoff: ['사가랴에게 건네기', [1.7, -4.6]], finishWho: '사가랴', requiresStory: true,
      cargo: '서판', symbol: '▰', pieces: [['잔칫상 위 서판', [-3.4, -4.77]]],
      secret: [[3.4, -5.3], '잔칫상 밑에 작은 신 한 짝이 떨어져 있어. 떠들다 발에서 빠진 모양이야.']
    },
    '4-0': {
      who: '할아버지', lines: [[null, '여기가 다윗의 동네란다. 성문 밖으로 한 발만 가도 우리가 양 치는 들이 있어.'],
        ['4-0', '다윗도 이 동네 막내였지. {이름}, 네 자리가 작아 보여도 하나님은 거기서부터 일을 시작하신단다.']],
      intro: '이름 올리러 온 사람들이 줄을 섰구나. 앞에 등불 든 안내인을 따라 줄 사이 빈 길로 돌아가렴.',
      done: '줄을 가로지르지 않고 잘 건넜구나. 여긴 사람들 뒤로 우리 들판까지 길이 열려 있어.',
      pos: [-3.8, 4.6], symbol: '🏮', pieces: [
        ['첫 줄 옆 안내인', [-4.1, 1.7], null, null, 'person'], ['두 줄 사이 안내인', [-.2, .4], null, null, 'person'],
        ['호적 탁자 옆 안내인', [2.8, -2.7], null, null, 'person'], ['성문 안쪽 안내인', [0, -6.9], null, null, 'person']
      ], secret: [[5.5, -6.3], '성문 옆 돌계단 끝으로 망루가 이어져. 위를 보면 문 너머 하늘이 한눈에 들어와.', 'star']
    },
    '4-1': {
      who: '여관 주인', lines: [[null, '양젖 가져왔으면 문 옆에 두고 가요. 오늘은 손님들이 한꺼번에 몰렸어요.'],
        ['4-1', '방이 꽉 찼다고 몇 번을 말했는지 몰라요. 골목 끝 등불은 아직 켜져 있던데.']],
      intro: '빈방이 있는지 문 네 곳에 물어봐 줘요. 먼 길에서 온 사람들이 아직 골목에 서 있어요.',
      done: '마지막 집 담 옆으로 작은 길이 열렸어요. 등불을 따라가면 마구간으로 돌아가는 길이 보여요.',
      pos: [-.1, 3.5], ordered: true, symbol: '✊', pieces: [
        ['낮은 문', [-5.4, -5.3], '방 없어요. 지붕까지 잠자리를 폈어요.', null, 'door'],
        ['등불 달린 문', [-.1, -7.25], '죄송해요. 친척들끼리도 자리를 나눠야 해요.', null, 'door'],
        ['돌문', [5.7, -5.6], '오늘 묵을 방은 없어요. 우리도 막 들어온 참이에요.', null, 'door'],
        ['골목 끝 문', [7.55, -2.6], '여기도 방은 없어요. 저 담 옆의 마구간 길을 한번 살펴봐요.', null, 'door']
      ], secretAfter: true, secret: [[7.4, -7.3], '담이 끝나는 곳에서 좁은 길이 뒤로 돌아가. 멀리 마구간 등불이 보여.']
    },
    '4-2': {
      who: '할아버지', lines: [[null, '잠깐, 다시 세어 보자. 제일 작은 녀석 발소리가 안 들리는구나.'],
        ['4-2', '품에 넣었더니 떠는 게 멎더구나. 봤니, 하나님도 어린 양을 그렇게 안아 주신단다.']],
      intro: '덤불 세 곳 가운데 새끼 양이 숨어 있단다. 잎이 흔들리는 데까지 가서 살펴보고, 찾으면 내게 데려오렴.',
      done: '이리 오너라, 작은 녀석. {이름}, 내 품에 안겨 주렴. 이제 겁먹지 않아도 되겠다.',
      pos: [.7, -2.8], hidden: true, symbol: '🌿', pieces: [
        ['서쪽 덤불', [-5, 1.55], null, null, 'bush'], ['우리 앞 덤불', [4.9, -3.8], null, null, 'bush'],
        ['큰 바위 곁 덤불', [5.1, -.3], null, null, 'bush']
      ], secret: [[6.8, -6.15], '바위 뒤 얕은 샘에 물이 졸졸 흘러. 작은 발굽 자국이 물가에서 끝나.']
    },
    '4-3': {
      who: '할아버지', lines: [[null, '오늘 밤은 네가 불을 지켜 줄 차례다. 바람이 거세면 장작부터 살피렴.'],
        ['4-3', '한 사람은 쉬고 한 사람은 깨어 있지. 덕분에 나도 불 곁에서 잠깐 눈을 감을 수 있겠다.']],
      intro: '불씨가 약해졌구나. 흩어진 장작 세 개를 주워 모닥불에 넣고, 그림자가 오면 등불을 들고 가까이 가렴.',
      done: '그림자도 물러갔고 불도 든든하구나. {이름}, 이제 양들이 편히 누워 있네.',
      pos: [-.1, -3.65], handoff: ['모닥불에 장작 넣기', [0, -5.35]], cargo: '장작', symbol: '🪵',
      pieces: [['천막 앞 장작', [-4.8, -3.9]], ['돌담 앞 장작', [4.5, 1.75]], ['불가에 남은 장작', [-1.8, -4.4]]],
      wolves: [[-3.2, -6.15], [5.5, 2.6], [2.25, -6.6]],
      secret: [[-7.2, -5.6], '언덕 망대에선 모닥불과 양 우리를 같이 내려다볼 수 있어. 먼저 파수를 서던 목자의 자국이 남아 있어.']
    },
    '4-4': {
      who: '할아버지', lines: [[null, '바람이 잦았구나. 앞이 어두우니 내 등불 곁으로 오렴.'],
        ['4-4', '들었지, 얘야? 표적은 구유란다. 저기 빛이 새는 문 앞까지 함께 가 보자.']],
      intro: '별빛 닿는 곳에서 등잔을 하나씩 밝혀 보렴. 마지막 불 너머가 마구간 문이다.',
      done: '여기다. 문틈에서 빛이 새는구나. {양}, 발걸음을 조금만 늦추자.',
      pos: [-1.4, 4.3], gift: ['blanket', '구유 이불'], ordered: true, symbol: '🪔', pieces: [
        ['별빛 길 첫 등잔', [-2.7, 2.2]], ['돌길 굽이 등잔', [1.6, .4]], ['울타리 옆 등잔', [2, -2.35]],
        ['문 앞 등잔', [.9, -4.5]], ['마구간 문 앞', [0, -5.95], null, '✦', 'door']
      ], secret: [[3.8, -5.6], '처마 바로 위에 큰 별이 걸려 있어. 지붕의 짚 끝까지 금빛이 닿아.', 'star']
    },
    end: {
      who: '요셉', lines: [[null, '아기가 잠들었어. {양}도 이리 와. 구유까지 조용히 걸어오면 돼.'],
        ['end', '{이름}, 또 만났네. 아기 이름은 예수야. 내가 처음으로 그 이름을 불렀어.']],
      intro: '{양}과 구유 앞에 잠깐 앉아 있자. 발소리를 낮추니 아기의 숨소리가 들려.',
      done: '{양}이 구유 앞에 조용히 무릎을 꿇었어. 이 밤을 여정 앨범 마지막 장에 남겨 볼까?',
      pos: [0, -4.38], photoPos: [.15, -4.8], manger: true
    }
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
    ep.ch === 2 || ['3-0', '3-1'].includes(ep.id) ? 2 : ep.ch === 3 ? 1 : 3;
  window.EXPLORE = Object.fromEntries(window.EPISODES.filter(ep => route[ep.id]).map((ep, index) => {
    const [kit, title, time, angle, variant] = route[ep.id];
    const [kind, activityTitle, secret, exclusive] = daily[ep.id];
    const cue = cues[ep.id];
    const { pieces = [], secret: nook, lines: dialogue, pos = [2.4, -1.8], photoPos = [4.95, 3.8], ...rules } = cue;
    const [name, lines] = people[cue.person] || [cue.who, dialogue];
    const peopleMarker = { id: 'person', type: 'person', name, title: name, pos: [-4.2, -2.75], lines };
    const word = { id: 'word', type: 'verse', pos: [-1.4, 1.05], title: '말씀 비석', ref: ep.card.key };
    const photo = { id: 'photo', type: 'photo', pos: photoPos, title: '포토 스팟' };
    const markers = [peopleMarker, { id: 'activity', type: 'quest', pos, title: activityTitle, name: cue.who || name }, word, photo];
    if (cue.extraVerse && cue.extraVerse !== ep.card.key) markers.push({ ...word, id: 'extra-word', title: '말씀 · ' + cue.extraVerse, extra: true, pos: [5.45, -4.15], ref: cue.extraVerse });
    if (secret) {
      const [pos, text, effect] = nook || [secretPos[(index * 3 + angle) % secretPos.length], secrets[ep.id]];
      markers.push({ id: 'secret', type: 'secret', title: secret, pos, text, effect });
    }
    const activity = { kind, title: activityTitle, exclusive, ...rules,
      pieces: pieces.map((piece, n) => {
        const [title, pos, text, symbol, type] = typeof piece === 'string' ? [piece, positions[n]] : piece;
        return { title, pos, text, symbol: symbol || cue.symbol, type };
      }) };
    return [ep.id, { kit, title, openHour: ep.openHour, seed: +(ep.date.replace(/-/g, '')), layout: { time, angle, variant }, region: region(ep), activity, markers }];
  }));
  const at = (title, x, z, type = 'find', extra = {}) => ({ title, pos: [x, z], type, ...extra });
  const person = (name, x, z, title = name) => at(title, x, z, 'person', { actor: name });
  const animal = (name, title, x, z, trail = false) => at(title, x, z, trail ? 'follow' : 'find', { animal: name, trail });
  const step = (goal, type, nodes, extra = {}) => ({ goal, type, nodes: nodes.split(' '), ...extra });
  const side = (title, ...steps) => ({ title, steps });
  const cargo = (name, icon) => ({ name, icon });

  const oilJar = cargo('기름 단지', '🫙'), sieve = cargo('빌린 체', '🧺'), jug = cargo('빈 물동이', '🏺');
  const fullJug = cargo('물이 찬 물동이', '💧'), slip = cargo('기도 쪽지', '📜'), lots = cargo('제비 돌 바구니', '🧺');
  const feather = cargo('흰 깃털', '🪶'), tablet = cargo('서판', '▰'), fragment = cargo('서판 조각', '▰');
  const gift = cargo('작은 선물', '🎁'), saddle = cargo('나귀 짐', '🧺'), cloth = cargo('접은 천', '🧵');
  const days = [
    {
      visual: 'temple', ambience: ['모험 장터', '모험 우물', '모험 밤길'],
      zones: ['바깥뜰 장터', '이방인의 뜰', '성소 앞 계단'],
      spawn: [-.65, 16.5], word: [-14.1, -12.5], photo: [0, -16.4], secret: [-18.3, -18.15],
      stars: [[-20.8, -3.9], [-11.4, -16.8], [13.8, -4.8]],
      targets: {
        guard: person('성전 문지기', -3.15, 13.75), merchant: person('등잔 상인', 9.2, 14.3),
        lamp1: at('장터 입구 등잔', -11.3, 17.7, 'light'), lamp2: at('동쪽 회랑 등잔', 6, -.9, 'light'),
        lamp3: at('서쪽 기둥 등잔', -6, -9.8, 'light'), lamp4: at('성전 계단 등잔', 3.9, -15.1, 'light'),
        child: person('엄마를 찾는 아이', -2.55, -17.3), mother: person('아이의 엄마', 15.8, 7.5),
        keeper: person('비둘기 할머니', -9.25, 14.65), bird1: animal('비둘기', '장터 비둘기', -14.4, 19.3),
        bird2: animal('비둘기', '우물 비둘기', 12.15, -.6), bird3: animal('비둘기', '회랑 비둘기', -8.3, -8.8),
        pilgrim: person('순례자 소년', 3.9, 4.25),
      },
      steps: [
        step('문지기에게 무슨 일이 있는지 물어보자', 'talk', 'guard', { line: cues['1-0'].lines[0][1] }),
        step('장터 등잔 상인에게서 기름 단지를 얻자', 'get', 'merchant', { give: oilJar, line: '깨어 있는 사람에겐 반값이지. 오늘은 이 단지를 가져가렴.' }),
        step('뜰에 꺼진 등잔 네 개를 밝히자', 'light', 'lamp1 lamp2 lamp3 lamp4', { take: oilJar, takeAtEnd: true, intro: cues['1-0'].intro }),
        step('성전 계단에서 아이를 찾아 엄마에게 데려다주자', 'escort', 'child mother', {
          lines: { child: '계단에 사람이 너무 많아. 엄마는 빨간 천이 있는 좌판 쪽에 계셔.', mother: '여기 있었구나! 기다리는 동안 얼마나 찾았는지 몰라.' } }),
        step('문지기에게 돌아가 인사하자', 'talk', 'guard', { line: cues['1-0'].done }),
      ],
      sides: [
        side('흩어진 비둘기', step('비둘기 할머니의 부탁을 듣자', 'talk', 'keeper', { line: '광주리 뚜껑이 열려서 셋이 날아갔어. 발견하면 천천히 이쪽으로 몰아 주렴.' }),
          step('비둘기 세 마리를 광주리 쪽으로 몰자', 'collect', 'bird1 bird2 bird3'), step('할머니에게 돌아가자', 'talk', 'keeper', { line: '셋 다 돌아왔네. 이제 광주리는 내가 지킬게.' })),
        side('비석을 찾는 순례자', step('순례자 소년에게 말을 걸자', 'talk', 'pilgrim', { line: '서쪽 올리브나무 쪽에 말씀이 새겨져 있다던데, 읽어 보고 와 줄래?' }),
          step('서쪽 회랑 너머 말씀 비석을 읽자', 'visit', 'word'), step('소년에게 비석 위치를 전하자', 'talk', 'pilgrim', { line: '서쪽 회랑을 따라 올라가면 되는구나. 나도 이제 찾아갈 수 있어.' })),
      ],
    },
    {
      visual: 'house', ambience: ['모험 우물', '모험 산길', '모험 지붕'],
      zones: ['우물가', '사가랴의 집 마당', '올라가는 지붕'],
      spawn: [-.5, 15.3], word: [-13.6, -8.3], photo: [-2.3, -18.5], secret: [-18.3, -17.4],
      stars: [[-17.8, 8.2], [9.3, -20.3], [18.3, -7.9]],
      targets: {
        elizabeth: person('엘리사벳', -4.1, 8.4), neighbor: person('이웃 아주머니', 14.2, 5.2),
        note1: at('지붕 난간의 쪽지', -5.45, -20.2), note2: at('빨랫줄 아래 쪽지', -8.6, 9.5),
        note3: at('올리브나무 쪽지', 12.15, -6.15), rooftop: person('엘리사벳', 2.6, -17, '지붕에서 기다리는 엘리사벳'),
        goatherd: person('염소를 치는 소년', -13.15, 3.85), pen: at('열린 염소 우리', -15.1, -1.6, 'clear'),
        waterHost: person('우물가 이웃', 7.8, 13.2), well: at('우물에서 물 긷기', 5.9, 9.25, 'quest'),
        basin: at('마당에 물동이 내려놓기', -10.5, 16.65, 'door'),
        carpenter: person('지붕을 살피는 목수', 8.2, -19.5),
        rope: at('빨랫줄 기둥의 묶음줄', -6.15, 9.3),
        rooftopBeam: at('바람에 들린 지붕 천막', -2.8, -19.4, 'clear'),
      },
      steps: [
        step('사가랴 집 마당에서 엘리사벳에게 인사하자', 'get', 'elizabeth', { give: sieve, line: cues['1-1'].lines[0][1] }),
        step('이웃 아주머니에게 빌린 체를 돌려드리자', 'deliver', 'neighbor', { take: sieve, line: '체는 여기에 두렴. 아까 기도 쪽지가 마당을 가로질러 날아가던데.' }),
        step('지붕과 마당, 올리브나무에서 쪽지 세 장을 찾자', 'collect', 'note1 note2 note3', { give: slip, intro: cues['1-1'].intro }),
        step('쪽지를 전하고 엘리사벳과 별을 보자', 'deliver', 'rooftop', { take: slip, line: cues['1-1'].done, effect: 'star' }),
      ],
      sides: [
        side('열린 염소 우리', step('염소를 치는 소년에게 말을 걸자', 'talk', 'goatherd', { line: '염소는 다 들어왔는데 문이 열려 있어. 나무 걸쇠를 내려 줄래?' }),
          step('염소 우리 문을 닫자', 'visit', 'pen'), step('소년에게 알려 주자', 'talk', 'goatherd', { line: '이제 염소들도 쉴 수 있겠다. 고마워!' })),
        side('우물에서 물동이 채우기', step('우물가 이웃의 물동이를 받자', 'get', 'waterHost', { give: jug, line: '마당엔 빈 물동이뿐이네. 우물물을 한 번 길어다 줄래?' }),
          step('우물물을 긷자', 'deliver', 'well', { take: jug, give: fullJug }), step('마당에 물동이를 내려놓자', 'deliver', 'basin', { take: fullJug })),
        side('지붕의 천막', step('지붕을 살피는 목수에게 말을 걸자', 'talk', 'carpenter', { line: '바람에 천막 모서리가 들려. 빨랫줄 기둥에 감아 둔 줄로 묶어 줄래?' }),
          step('마당에서 줄을 가져와 지붕 천막을 묶자', 'follow', 'rope rooftopBeam', { at: {
            rope: { give: cargo('묶음줄', '🧶') }, rooftopBeam: { take: cargo('묶음줄', '🧶') }
          } }), step('목수에게 천막을 묶었다고 알려 주자', 'talk', 'carpenter', { line: '이제 지붕에 올라와도 천막이 뒤집히지 않겠어.' })),
      ],
    },
    {
      visual: 'temple', variant: 'procession', time: 'day', ambience: ['모험 장터', '모험 뜰', '모험 성소'],
      zones: ['성전 바깥뜰', '제사장들의 회랑', '제비를 뽑는 계단'],
      spawn: [0, 16.2], word: [-12.1, -.5], photo: [1.1, -16.8], secret: [19.1, -18.8],
      stars: [[-19.9, 3.4], [9.9, -17.5], [18.1, 14]],
      targets: {
        priest1: person('젊은 제사장', -3.2, 10.8), priest2: person('제사장', 4.75, -2.1),
        zach: person('사가랴', -3.65, -10.3), stones: at('제비 돌 바구니', -13.8, 11.25, 'find'),
        presider: person('제비를 맡은 제사장', 2.6, -15.7),
        dove1: animal('비둘기', '회랑 끝 흰 비둘기', -10, -7.4, true), dove2: animal('비둘기', '바깥뜰 비둘기 떼', 9.3, 6.2, true),
        dove3: at('비둘기가 남긴 흰 깃털', 13.9, -9.7),
        draw: at('제사장들이 모인 곳', 0, -18.5, 'event'),
        lambOwner: person('성전 밖 목자', 3.7, 18.3), lostLamb: animal('어린 양', '길 잃은 어린 양', -15.1, -10.5),
        basketMaker: person('광주리 장수', -9.3, 13.65), clothSpot: at('접어 둔 천', 12.6, 1.4),
      },
      steps: [
        step('제사장들 줄을 지나 사가랴를 찾자', 'follow', 'priest1 priest2 zach', { lines: {
          priest1: '같은 반열 사람들은 회랑에 모였어요. 저 앞 제사장에게 물어보세요.', priest2: '사가랴는 서쪽 기둥 안쪽에 서 있어요.', zach: people.zachariah[1][0][1] } }),
        step('바깥뜰 제비 돌 바구니를 계단에 전하자', 'follow', 'stones presider', {
          at: { stones: { give: lots }, presider: { take: lots } }, lines: { presider: '바구니가 왔으니 제비를 뽑을 준비를 하지.' } }),
        step('비둘기 떼가 날아간 자리에서 흰 깃털을 찾자', 'follow', 'dove1 dove2 dove3', {
          at: { dove3: { give: feather } }, effects: { dove1: 'doves', dove2: 'doves' }, intro: cues['1-2'].intro }),
        step('계단에서 사가랴가 뽑히는 순간을 보자', 'scene', 'draw', {
          line: '제사장들이 둥글게 모였어. 바구니에서 꺼낸 제비가 사가랴의 손 위에 놓였어.', effect: 'ceremony' }),
      ],
      sides: [
        side('길 잃은 어린 양', step('목자의 부탁을 듣자', 'talk', 'lambOwner', { line: '어린 양이 회랑 쪽에 남았어. 발소리를 들으면 너를 따라갈 거야.' }),
          step('어린 양을 찾아 성전 밖 목자에게 안내하자', 'escort', 'lostLamb lambOwner', { lines: { lambOwner: '돌아왔구나. 네 양이 함께 걸어 줘서 겁을 덜 먹었나 봐.' } })),
        side('광주리 덮개', step('광주리 장수에게 말을 걸자', 'talk', 'basketMaker', { line: '바람이 불기 전에 천으로 광주리를 덮고 싶어. 우물 건너에 접어 놨어.' }),
          step('우물 건너 천을 찾아 전하자', 'follow', 'clothSpot basketMaker', { at: { clothSpot: { give: cloth }, basketMaker: { take: cloth } }, lines: { basketMaker: '이걸 덮으면 제비 돌도 흩어지지 않겠다.' } })),
      ],
    },
    {
      visual: 'sanctuary', ambience: ['모험 밤길', '모험 뜰', '모험 성소'],
      zones: ['기도하는 바깥뜰', '향 연기의 회랑', '휘장 앞'],
      spawn: [0, 16.3], word: [11.9, -7.7], photo: [-10.4, -16.2], secret: [0, -19.65],
      stars: [[-18.9, 8.8], [-11.3, -18.9], [17.4, -.4]],
      targets: {
        prayer: person('기도하는 사람들', -3.5, 9.25, '기도하는 바깥뜰'),
        smoke1: at('뜰 끝에 번지는 향 연기', 5.7, .3, 'follow', { symbol: '〰' }),
        smoke2: at('서쪽 기둥 사이의 향 연기', -9.8, -9.55, 'follow', { symbol: '〰' }),
        smoke3: at('향단 가까이 피어나는 연기', 2.9, -17.5, 'follow', { symbol: '〰' }),
        waiting: person('기다리는 사람', 3.9, -4, '제사장이 나오기를 기다리는 사람들'),
        widow: person('늙은 과부', -10.7, 10.3), bench: at('사람이 적은 돌의자', -14.4, -7.4),
        lampKeeper: person('향단을 돌보는 일꾼', 5.2, -12.9), clothSpot: at('바구니 속 접은 천', 14.6, 5.8),
        towerKeeper: person('계단 등잔지기', -9.4, -17.7),
        screen: at('장터의 바람막이 토기', -13.55, 15.75), towerLamp: at('계단에서 흔들리는 등잔', -2.25, -14.8, 'light'),
      },
      steps: [
        step('백성들과 함께 열 초 동안 기도하며 서 있자', 'wait', 'prayer', { seconds: 10, line: '우리와 잠시 함께 서 있겠니? 향이 피어오르는 동안 여기서 기도하고 있어.' }),
        step('기둥 사이로 흐르는 향 연기를 따라가자', 'follow', 'smoke1 smoke2 smoke3', { intro: cues['1-3'].intro }),
        step('휘장 틈을 살펴보자', 'visit', 'secret', { effect: 'star' }),
        step('바깥으로 돌아가 기다리는 사람들을 만나자', 'talk', 'waiting', { line: '평소보다 오래 걸리네. 사가랴가 무슨 일을 만났을까?' }),
      ],
      sides: [
        side('쉴 곳을 찾는 과부', step('과부의 부탁을 듣자', 'talk', 'widow', { line: '서서 기다리기엔 다리가 좀 아프구나. 사람이 덜 붐비는 곳에 앉을 자리가 있을까?' }),
          step('조용한 돌의자를 찾아 과부에게 알려 주자', 'follow', 'bench widow', { lines: { widow: '서쪽 기둥 너머구나. 거기라면 기도 소리도 잘 들리겠어.' } })),
        side('향단 곁의 천', step('향단을 돌보는 일꾼에게 말을 걸자', 'talk', 'lampKeeper', { line: '손을 닦을 천이 바깥 바구니에 있어. 돌아오는 길에 가져다줄래?' }),
          step('접어 둔 천을 찾아 전하자', 'follow', 'clothSpot lampKeeper', { at: { clothSpot: { give: cloth }, lampKeeper: { take: cloth } }, lines: { lampKeeper: '고마워. 아직 기다리는 사람들이 있으니 자리를 정돈해야겠어.' } })),
        side('계단 등잔의 바람막이', step('계단 등잔지기의 부탁을 듣자', 'talk', 'towerKeeper', { line: '등잔 불꽃이 자꾸 바람에 눕는구나. 장터에서 작은 토기 가리개를 가져오겠니?' }),
          step('장터에서 토기를 가져와 계단 등잔에 씌우자', 'follow', 'screen towerLamp', { at: {
            screen: { give: cargo('토기 바람막이', '🏺') }, towerLamp: { take: cargo('토기 바람막이', '🏺') }
          } }), step('등잔지기에게 돌아가자', 'talk', 'towerKeeper', { line: '불이 가만히 서 있네. 이제 기다리는 사람들이 계단을 잘 볼 수 있겠구나.' })),
      ],
    },
    {
      visual: 'temple', variant: 'steps', ambience: ['모험 장터', '모험 뜰', '모험 성소'],
      zones: ['서판 장터', '웅성이는 가운데 뜰', '성전 돌계단'],
      spawn: [0, 15.5], word: [17.35, -5.5], photo: [0, -17.3], secret: [-18.2, -18.6],
      stars: [[-20.6, 3.1], [-10.7, -15.8], [17.9, 12.1]],
      targets: {
        gather: person('기다리던 사람', 1.2, 1.5),
        child1: person('돌담 아이', -3.1, -2.8), child2: person('기둥 아이', 4.5, -6.55), child3: person('계단 아이', 1.3, -10.1),
        sign1: person('사가랴', -1.5, -14.4, '계단에서 손짓하는 사가랴'),
        sign2: person('사가랴', -8.1, -2.9, '회랑에서 손짓하는 사가랴'),
        sign3: person('사가랴', -5.4, 9.7, '장터를 가리키는 사가랴'),
        seller: person('서판 상인', 9.3, 13.2), zach: person('사가랴', -1.7, -16.9),
        witness1: person('계단의 순례자', 9.8, -14.1), witness2: person('회랑의 이웃', -11.9, -5.1),
        witness3: person('뜰에 있던 행인', 11.1, 9.6),
        stallkeeper: person('등잔을 지키는 사람', -9.3, 13.5), seat: at('회랑의 작은 발판', -13.8, -8.5),
      },
      steps: [
        step('군중 사이에서 아이 세 명을 30초 안에 찾자', 'timed', 'child1 child2 child3',
          { seconds: 30, start: 'gather', intro: cues['1-4'].intro }),
        step('손짓하는 사가랴를 계단부터 따라가자', 'follow', 'sign1 sign2 sign3', { lines: {
          sign1: '사가랴가 입술에 손가락을 대고 서쪽 회랑을 가리켜.',
          sign2: '사가랴가 손바닥에 글씨를 쓰는 시늉을 해.',
          sign3: '사가랴가 장터의 서판 좌판을 가리켜.' } }),
        step('서판 상인에게서 서판을 얻어 사가랴에게 전하자', 'follow', 'seller zach', {
          at: { seller: { give: tablet }, zach: { take: tablet } }, lines: {
            seller: '이 서판과 뾰족한 막대를 가져가. 목소리가 안 나와도 말을 전할 수 있어.',
            zach: '사가랴가 서판을 받아 들고 천천히 고개를 끄덕여.' } }),
      ],
      sides: [
        side('같은 일을 본 세 사람', step('뜰 사람들에게서 서로 다른 말을 들어 보자', 'talk', 'witness1 witness2 witness3', { lines: {
          witness1: '성소에서 나오시는 데 시간이 꽤 걸렸어. 난 무슨 일이 났나 했지.',
          witness2: '말씀은 못 들었어. 두 팔로 여러 번 손짓하시는 건 봤어.',
          witness3: '나는 그분이 우리 얼굴부터 둘러보신 게 기억나.' } })),
        side('등잔을 닦을 발판', step('등잔을 지키는 사람의 부탁을 듣자', 'talk', 'stallkeeper', { line: '높은 등잔을 닦아야 하는데 발판이 회랑에 있어. 가져다줄 수 있니?' }),
          step('작은 발판을 가져다주자', 'follow', 'seat stallkeeper', { at: { seat: { give: cargo('작은 발판', '🪵') }, stallkeeper: { take: cargo('작은 발판', '🪵') } }, lines: { stallkeeper: '이제 저 높은 곳에도 손이 닿겠네.' } })),
      ],
    },
    {
      visual: 'hills', ambience: ['모험 산길', '모험 산길', '모험 우물'],
      zones: ['산길 어귀', '올리브 고갯길', '돌담 너머 집'],
      spawn: [-.1, 16.4], word: [-13.3, -8.25], photo: [2.8, -17.2], secret: [-18.7, -17.8],
      stars: [[-16.1, 7.6], [8.8, -18.4], [18.2, 12.1]],
      targets: {
        start: person('사가랴', 2.6, 12.8, '길을 알려 주는 사가랴'),
        bend: person('사가랴', -5.1, 2.4, '고갯길의 사가랴'),
        gate: person('사가랴', -3.2, -12.9, '돌담 앞 사가랴'),
        bit1: at('올리브나무 아래 조각', 9.3, -4.35), bit2: at('돌담 곁 조각', -17.9, -8.4),
        bit3: at('비탈길 조각', -5.7, 12.4),
        elizabeth: person('엘리사벳', 1.25, -18.25),
        muleKeeper: person('나귀를 이끄는 사람', -8.8, 9.75),
        mule: { ...animal('나귀', '짐 때문에 멈춘 나귀', -6.9, 5.3), stationary: true },
        load: at('돌담의 빈 짐자리', 10.45, 9.55),
        traveler: person('산길 나그네', 11.7, 5.5), water: at('우물에서 물 긷기', 5.9, 9.25, 'quest'),
      },
      steps: [
        step('사가랴와 만나 돌담까지 산길을 따라가자', 'follow', 'start bend gate', { lines: {
          start: '집에. 올라갑시다.', bend: '바람이 세오. 돌담 안쪽으로.', gate: '서판이 깨졌소. 주워 주겠소?' } }),
        step('고개 아래 흩어진 서판 조각 세 개를 찾자', 'collect', 'bit1 bit2 bit3', { give: fragment, intro: cues['1-5'].intro }),
        step('집에 있는 엘리사벳에게 서판을 전하자', 'deliver', 'elizabeth', { take: fragment, line: cues['1-5'].done }),
      ],
      sides: [
        side('멈춰 버린 나귀', step('나귀를 이끄는 사람과 이야기를 나누자', 'talk', 'muleKeeper', { line: '나귀가 짐을 무거워 해. 짐 일부를 옮기거나 큰 양이 수레를 밀어 줘도 돼.' }),
          step('나귀 짐을 덜어 돌담 옆에 내려놓자', 'follow', 'mule load', { at: { mule: { give: saddle }, load: { take: saddle } }, alternative: 'push' }),
          step('짐을 덜고 다시 걸을 수 있는지 확인하자', 'talk', 'muleKeeper', { line: '나귀가 다시 발을 뗐어. 이제 돌담까지는 천천히 걸어갈 수 있겠구나.' })),
        side('산길에서 물 한 모금', step('길가 나그네의 부탁을 듣자', 'get', 'traveler', { give: jug, line: '오래 걸었더니 목이 마르네. 우물에서 물 한 모금 길어다 줄래?' }),
          step('우물물을 길어 나그네에게 전하자', 'follow', 'water traveler', { at: { water: { take: jug, give: fullJug }, traveler: { take: fullJug } }, lines: { traveler: '덕분에 고개를 하나 더 넘을 수 있겠다.' } })),
      ],
    },
    {
      visual: 'roofs', time: 'predawn', ambience: ['모험 밤길', '모험 우물', '모험 지붕'],
      zones: ['새벽 마을 입구', '선물을 놓는 골목', '별을 보는 지붕'],
      spawn: [0, 14.7], word: [-13.7, -5.1], photo: [4.2, -18.8], secret: [-17.65, -19.5],
      stars: [[-17.4, 7.8], [9.95, -20.35], [17.4, -7.45]],
      targets: {
        elizabeth: person('엘리사벳', -3.6, -11.9),
        abraham: at('아브라함의 별', -6.5, -17.5, 'event'), david: at('다윗의 별', 4.9, -13.2, 'event'), today: at('오늘의 별', -.2, -20.6, 'event'),
        door1: at('우물 골목 집 문 앞', 10.2, 16.95, 'door'),
        door2: at('빨랫줄 건너 집 문 앞', -13.4, 4.95, 'door'),
        door3: at('돌담 끝 집 문 앞', 16.6, -13.05, 'door'),
        sunrise: person('엘리사벳', 2.9, -17.7, '지붕에서 새벽 별 보기'),
        sweeper: person('골목을 쓰는 이웃', 11.7, 8.45), scarf: at('돌담에 걸린 천', -16.95, -10.9),
        potter: person('물동이를 만드는 이웃', -9.3, 12.2), loom: at('빨랫줄의 털실', -7.45, 9.55),
      },
      steps: [
        step('지붕에서 엘리사벳의 다섯 달 이야기를 듣자', 'talk', 'elizabeth', { line: cues['1-6'].lines[1][1] }),
        step('아브라함, 다윗, 오늘 순서로 세 별을 이어 보자', 'order', 'abraham david today', { give: gift, amount: 3, giveAtEnd: true, intro: cues['1-6'].intro }),
        step('마을 사람들이 깨기 전에 집 세 곳에 선물을 놓자', 'deliver', 'door1 door2 door3', { take: gift }),
        step('지붕에서 엘리사벳과 새벽 별을 보자', 'scene', 'sunrise', { line: cues['1-6'].done, effect: 'star' }),
      ],
      sides: [
        side('돌담에 걸린 천', step('골목을 쓰는 이웃에게 말을 걸자', 'talk', 'sweeper', { line: '저녁에 걷어 둔 천이 바람에 날아갔어. 돌담 쪽에 걸렸나 봐.' }),
          step('돌담의 천을 찾아 전해 주자', 'follow', 'scarf sweeper', { at: { scarf: { give: cloth }, sweeper: { take: cloth } }, lines: { sweeper: '새벽이슬에 많이 젖기 전에 가져왔네. 고마워.' } })),
        side('물동이 손잡이', step('옹기 이웃에게 말을 걸자', 'talk', 'potter', { line: '손잡이를 묶을 실이 필요해. 빨랫줄 끝에 걸린 짧은 털실을 가져다줄래?' }),
          step('털실을 찾아 옹기 이웃에게 전하자', 'follow', 'loom potter', { at: { loom: { give: cargo('짧은 털실', '🧶') }, potter: { take: cargo('짧은 털실', '🧶') } }, lines: { potter: '이 실로 손잡이를 단단히 묶을게.' } })),
      ],
    },
  ];

  // 같은 단계 안에서 표지·도구·이웃을 만나며 다음 행동의 단서를 얻는다.
  const oilWick = cargo('심지 묶음', '🧵');
  const focused = [
    {
      targets: {
        wickMaker: person('심지를 꼬는 사람', -15.65, -5.8),
        lampClue: at('문지기가 그린 등잔 위치', -2.8, 8.0, 'quest'),
        stairTurn: at('아이 발자국이 남은 서쪽 계단', -11.3, -14.45, 'follow'),
      },
      steps: {
        1: { type: 'follow', nodes: ['wickMaker', 'merchant'], at: { wickMaker: { give: oilWick }, merchant: { take: oilWick, give: oilJar } },
          lines: { wickMaker: '빈 등잔엔 마른 심지도 필요해. 이 묶음을 가져가서 상인에게 보여 줘.', merchant: days[0].steps[1].line }, line: undefined },
        2: { nodes: ['lampClue', ...days[0].steps[2].nodes], first: 'lampClue', lines: { lampClue: '바깥뜰 하나, 회랑 둘, 성소 앞 계단 하나. 불을 붙이면 불빛이 남아.' } },
        3: { type: 'escort', nodes: ['stairTurn', 'child', 'mother'], passenger: 'child',
          lines: { ...days[0].steps[3].lines, stairTurn: '작은 발자국이 여기서 안쪽 계단으로 향해. 문지기가 말했던 아이일까?' } },
        4: { type: 'follow', nodes: ['mother', 'guard'], lines: { mother: '마지막 등잔 덕분에 아이가 돌아오는 길이 환했어.', guard: days[0].steps[4].line }, line: undefined },
      },
    },
    {
      targets: {
        sieveHook: at('사가랴 집 문 옆의 체', -13.9, -14.1), neighborDoor: at('빈 체를 거는 이웃집 문', 15.8, -12.65, 'door'),
        ribbon: at('처마에 걸린 쪽지 끈', 15.6, -8.25, 'follow'), stair: at('쪽지가 걸린 집 뒤 돌계단', -3.2, -8.9, 'follow'),
      },
      steps: {
        0: { type: 'follow', nodes: ['elizabeth', 'sieveHook'], at: { sieveHook: { give: sieve } }, give: undefined,
          lines: { elizabeth: cues['1-1'].lines[0][1] }, line: undefined },
        1: { type: 'follow', nodes: ['neighborDoor', 'neighbor'], takeAtEnd: true,
          lines: { neighbor: days[1].steps[1].line }, line: undefined },
        2: { type: 'find', nodes: ['ribbon', 'note2', 'note3', 'stair', 'note1'],
          give: undefined, at: { note1: { give: slip }, note2: { give: slip }, note3: { give: slip } },
          lines: { ribbon: '처마에 빈 끈만 걸렸어. 아래 빨랫줄과 높은 지붕 양쪽을 살펴보자.' } },
        3: { takeCount: 3 },
      },
    },
    {
      targets: {
        lineEast: person('줄을 정리하는 제사장', 12.7, -8.45),
        stoneTable: person('제비 돌을 살피는 사람', -13.9, -15.1),
        featherCheck: person('회랑의 기록 담당', -8.9, 6.4),
      },
      steps: {
        0: { nodes: ['priest1', 'lineEast', 'priest2', 'zach'], lines: { ...days[2].steps[0].lines,
          lineEast: '이쪽 줄은 바깥뜰 일을 맡았어요. 제비 뽑는 반열은 맞은편으로 갔어요.' } },
        1: { nodes: ['stones', 'stoneTable', 'presider'], lines: { ...days[2].steps[1].lines,
          stoneTable: '제비 돌을 확인했어요. 이제 바구니를 계단으로 가져가세요.' } },
        2: { nodes: ['dove1', 'dove2', 'dove3', 'featherCheck'],
          lines: { featherCheck: '흰 깃털이네. 비둘기 떼가 먼저 날아가 뜰이 조용해졌어.' } },
        3: { take: feather },
      },
    },
    {
      targets: {
        prayerGuide: person('바깥뜰을 지키는 사람', -13.65, 14.3),
        smokeWest: at('바람에 얇아진 연기', -13.95, -2.1, 'follow', { symbol: '〰' }),
        smokeEast: at('회랑 끝에서 솟는 연기', 13.6, -13.6, 'follow', { symbol: '〰' }),
        curtainTurn: at('휘장으로 이어진 바닥의 빛', -12.4, -17.9, 'follow', { symbol: '✧' }),
        lastRow: person('바깥뜰 끝에서 기다리는 사람', 12.9, 16.75),
      },
      steps: {
        0: { nodes: ['prayerGuide', 'prayer'], waitAt: 'prayer',
          lines: { prayerGuide: '백성들이 안쪽 뜰에 모여 있어. 조용히 걸어가 함께 기다리렴.' } },
        1: { nodes: ['smokeWest', 'smoke1', 'smoke2', 'smokeEast', 'smoke3'] },
        2: { type: 'follow', nodes: ['curtainTurn', 'secret'], lines: { curtainTurn: '바닥에 가느다란 빛이 비쳐. 빛을 거슬러 올라가 보자.' } },
        3: { type: 'follow', nodes: ['lastRow', 'waiting'], lines: { lastRow: '아직도 기다리는 사람이 많구나. 안쪽 소식을 들은 사람이 있을까?' } }
      },
    },
    {
      targets: {
        gatherGuide: person('뜰 입구의 어른', -10.25, 12.8),
        slateSample: at('돌돌 말린 밀랍과 나무 테두리', -14.7, -8.9, 'find'),
        stylus: at('서판에 쓰는 뾰족한 막대', 15.25, 5.6, 'find'),
        zachWait: person('계단 가까이 있던 사람', 12.55, -11.35),
      },
      steps: {
        0: { approach: 'gatherGuide', lines: { gatherGuide: '아이들이 계단 아래로 달려갔어. 기다리던 사람에게 놀이 규칙을 먼저 물어봐.' } },
        2: { nodes: ['seller', 'slateSample', 'stylus', 'zachWait', 'zach'],
          lines: { ...days[4].steps[2].lines,
            seller: '서판은 여기 있어. 글씨를 쓸 막대는 건너편 좌판에서 챙겨.', slateSample: '밀랍을 나무 틀에 얇게 발라. 그래야 글씨를 썼다가 지울 수 있지.',
            zachWait: '사가랴가 사람들 사이를 지나 다시 계단 쪽으로 갔어.' } },
      },
    },
    {
      targets: {
        bendSouth: person('산길의 사가랴', 13.25, 5.5, '첫 고개를 둘러보는 사가랴'),
        olivesTurn: at('올리브나무에 걸린 서판 끈', 14.3, -12.4, 'follow'),
        stoneDitch: at('돌담 아래 파인 홈', -12.8, 5.6, 'follow'),
        boardBench: at('서판 조각을 맞춰 보는 돌 탁자', 13.55, -10.4, 'find'),
      },
      steps: {
        0: { nodes: ['start', 'bendSouth', 'bend', 'gate'], lines: { ...days[5].steps[0].lines,
          bendSouth: '저쪽은 비탈. 올리브나무 앞에서 길이 갈라집니다.' } },
        1: { nodes: ['olivesTurn', 'bit1', 'bit2', 'stoneDitch', 'bit3'], give: undefined,
          at: { bit1: { give: fragment }, bit2: { give: fragment }, bit3: { give: fragment } },
          lines: { olivesTurn: '서판 줄이 여기 걸려 있었어. 바람이 골짜기로 이어져.', stoneDitch: '돌담 밑에서 멈췄던 조각이 비탈 아래로 한 번 더 굴러갔어.' } },
        2: { type: 'follow', nodes: ['boardBench', 'elizabeth'], takeAtEnd: true, takeCount: 3,
          line: undefined, lines: { boardBench: '모서리를 맞추니 조각 셋이 한 장이 됐어. 그대로 엘리사벳에게 전하자.', elizabeth: cues['1-5'].done } },
      },
    },
    {
      targets: {
        entryNeighbor: person('새벽에 물 긷는 이웃', 14.0, 9.5),
        basketGift: at('선물을 담아 둔 바구니', -12.2, -13.2, 'find'),
        lightFoot: at('새벽빛이 닿는 계단 아래', -15.8, 5.05, 'follow'),
      },
      steps: {
        0: { type: 'follow', nodes: ['entryNeighbor', 'elizabeth'], line: undefined,
          lines: { entryNeighbor: '새벽이라 아직 집집마다 조용해. 엘리사벳은 지붕 위에 있단다.', elizabeth: cues['1-6'].lines[1][1] } },
        2: { nodes: ['basketGift', 'door1', 'door2', 'door3'], first: 'basketGift', at: { basketGift: { take: null } }, intro: '바구니에서 골목을 확인해. 깨어나기 전에 문 앞에 선물을 놓고 오자.' },
        3: { nodes: ['lightFoot', 'sunrise'], line: undefined, lines: {
          lightFoot: '골목 끝부터 새벽빛이 번져. 지붕 위에선 어디까지 보일까?', sunrise: cues['1-6'].done } },
      },
    },
  ];

  for (const [index, layer] of focused.entries()) {
    const adventure = days[index];
    Object.assign(adventure.targets, layer.targets);
    for (const [i, extra] of Object.entries(layer.steps)) Object.assign(adventure.steps[i], extra);
  }

  for (const [index, adventure] of days.entries()) {
    const area = window.EXPLORE['1-' + index], { targets, visual, word, photo, secret, stars, time, variant } = adventure;
    const inherited = area.markers.filter(m => ['verse', 'secret', 'photo'].includes(m.type));
    const uphill = visual === 'temple' || visual === 'sanctuary';
    const cart = index === 5 ? [-6.55, 6.6] : [16.8, 2.5];
    const jump = [stars[1][0], stars[1][1] + 1.55];
    const shine = index === 5 ? [-11.8, -16.15] : [secret[0] + (secret[0] > 17 ? -2.65 : 2.9), Math.max(-20, secret[1] + 1.65)];
    for (const marker of inherited) {
      const pos = { word, photo, secret, 'extra-word': [10.95, -12.3] }[marker.id];
      targets[marker.id] = { ...marker, pos, title: marker.id === 'photo' ? '여정 사진 찍기' : marker.title };
    }
    Object.assign(targets, {
      'star-1': at('성벽 틈의 별 조각', ...stars[0], 'fragment', { hidden: true, clue: uphill ? '바깥뜰 서쪽의 긴 성벽을 따라 걸어 봐.' : '마을 왼쪽 돌담 밑에 작은 틈이 있어.' }),
      'star-2': at('높은 턱 너머 별 조각', ...stars[1], 'fragment', { hidden: true, clue: '북쪽 높은 턱은 옆길로 돌아가도 돼. 어린 양이면 낮은 턱을 뛸 수 있어.' }),
      'star-3': at(index === 0 ? '우물 뒤 별 조각' : '그늘의 별 조각', ...stars[2], 'fragment',
        { hidden: true, clue: index === 0 ? '우물에서 물 소리가 가장 또렷한 쪽을 살펴봐.' : '동쪽의 인적 드문 그늘을 살펴봐.' }),
      jump: at('낮은 담', ...jump, 'ability', { feature: 'jump' }),
      push: at(index === 5 ? '짐이 실린 나귀 수레' : '길을 막은 수레', ...cart, 'ability', { feature: 'push' }),
      shine: at('빛이 닿지 않는 틈', ...shine, 'ability', { feature: 'shine' }),
      'cart-cache': at('수레 뒤에 남은 기름', cart[0] - 1.05, cart[1] - 1.15, 'cache', { hidden: true }),
      'light-cache': at('빛이 비친 작은 기름병', shine[0] - .93, shine[1] + 1.18, 'cache', { hidden: true }),
    });
    if (time) area.layout.time = time;
    if (variant) area.layout.adventureVariant = variant;
    adventure.crossings = [[[-11, 11.25], [10, -11.85]], [[-11, 6.8], [5.1, -10.9]],
      [[10.5, 8.2], [-12.8, -11.85]], [[-11.2, 6.8], [10.2, -11.85]],
      [[10.5, 7.25], [-9.75, -12.0]], [[-10.6, 7.9], [11.15, -11.9]],
      [[10.5, 6.8], [-5.2, -10.8]]][index];
    area.adventure = adventure;
    area.steps = adventure.steps;
    area.markers = inherited.map(marker => ({ id: marker.id, ...targets[marker.id] }));
  }
})();
