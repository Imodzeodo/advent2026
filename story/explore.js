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

  const wedge = cargo('나무 말뚝', '🪵'), scraps = cargo('나무 조각', '🪵');
  const flowers = cargo('흰 꽃잎', '🌸'), rope = cargo('새 줄', '🪢');
  const waterskin = cargo('가죽 물통', '💧'), washBasin = cargo('빈 대야', '🪣');
  const peaceDays = [
    {
      visual: 'desert', ambience: ['모험 산길', '모험 산길', '모험 밤길'],
      zones: ['광야 어귀', '마른 물길', '바람 고개'],
      crossings: [[-8, 7], [9, -11]],
      spawn: [0, 17], word: [14.6, -8.4], photo: [2, -19], secret: [-16.3, -17],
      stars: [[-18.3, 9.8], [11.5, -18.2], [18, -.3]],
      starClues: ['광야 어귀 서쪽, 납작한 돌들이 포개진 곳.', '고개 동쪽의 낮은 턱 너머. 옆에서 돌아 들어갈 수도 있어.', '물이 흘렀던 자국을 동쪽으로 따라가 봐.'],
      fauna: [['나귀', [2.8, 14]], ['염소', [-9.7, 2.2]], ['비둘기', [1.4, -15]]],
      targets: {
        joseph: person('요셉', -2.6, 14.6), guide: person('고갯길 목자', 9.9, -13.5),
        rock1: at('어귀의 납작한 돌', -7.9, 5.4, 'clear'),
        rock2: at('물길에 박힌 돌', -2.6, 2, 'clear'),
        rock3: at('물길을 가르는 큰 돌', 4.2, -2, 'clear'),
        rock4: at('굽이의 모난 돌', 9.6, -7.8, 'clear'),
        rock5: at('고개에 걸린 돌', 6.2, -14, 'clear'),
        pass: at('돌을 치운 고갯길', -2.2, -17.8, 'event'),
        stonewright: person('돌표지를 세우는 사람', -7.1, 12.4), marker: at('넘어진 갈림길 돌표지', -12.9, -5.8, 'clear'),
        herder: person('나귀를 돌보는 아이', 12.1, -15.3), saddlecloth: at('마른 물길에 떨어진 안장 천', 14.9, 1.4),
        traveler: person('광야를 건너는 행인', 11.2, 14.5), cairn: at('마른 물길 옆 돌무더기', 17, -5.2, 'visit'),
        tent: person('언덕 천막의 노인', -13.7, -15.7), cup: at('어귀 나귀 곁의 가죽 물통', -5, 16.4),
        shade: at('낮은 바위 그늘', 13.2, -2.1, 'visit'), travelerRest: at('행인과 만나기로 한 고개', 12.1, -16.5, 'visit'),
      },
      steps: [
        step('광야 어귀에서 요셉과 이야기하자', 'talk', 'joseph', { line: '회당에서 길을 닦으라는 말씀을 들었어. 여기선 딱 봐도 어디부터 손대야 할지 알겠다.' }),
        step('고갯길 목자에게 어디가 막혔는지 묻자', 'talk', 'guide', { line: '물이 빠지고 돌 다섯이 남았어. 어귀부터 여기까지 길 가운데를 살펴봐.' }),
        step('광야 길을 막은 돌 다섯 개를 가장자리로 굴리자', 'clear', 'rock1 rock2 rock3 rock4 rock5', { intro: '돌 곁에서 한 번 더 밀면 길 밖으로 굴릴 수 있어.' }),
        step('돌을 치운 고갯길을 끝까지 걸어 보자', 'scene', 'pass', { line: '길이 트이자 고개 너머로 나귀 방울 소리가 들려.' }),
        step('요셉에게 길이 열렸다고 전하자', 'talk', 'joseph', { line: '이젠 짐을 지고도 지나갈 수 있겠네. 나도 돌아가면 문틀부터 바로 세워야지.' }),
      ],
      sides: [
        side('넘어진 돌표지', step('돌표지를 세우는 사람과 이야기하자', 'talk', 'stonewright', { line: '물이 한번 지나가더니 돌표지가 넘어졌어. 화살표가 고개로 향하게 세워 줄래?' }),
          step('갈림길에서 돌표지를 세우고 돌아오자', 'follow', 'marker stonewright', { lines: { stonewright: '고개 쪽이 한눈에 보이겠어. 처음 온 사람도 길을 찾겠구나.' } })),
        side('나귀의 안장 천', step('나귀를 돌보는 아이의 부탁을 듣자', 'talk', 'herder', { line: '안장 아래에 까는 천을 물길에서 떨어뜨렸어. 덧대야 등이 안 쓸려.' }),
          step('마른 물길에서 안장 천을 찾아 건네자', 'follow', 'saddlecloth herder', {
            at: { saddlecloth: { give: cloth }, herder: { take: cloth } }, lines: { herder: '모래만 털면 되겠다. 나귀가 이제 편히 짐을 지겠어.' } })),
        side('바람 고개로 가는 행인', step('광야 어귀의 행인에게 말을 걸자', 'talk', 'traveler', {
          line: '길은 찾았는데 물통을 두고 왔어. 고개까지 걸어갈 동안 잠깐 쉴 곳이 있으면 좋겠어.' }),
          step('돌무더기 너머 천막에서 쉴 곳을 물어보자', 'follow', 'cairn tent', { lines: {
            cairn: '돌무더기 옆으로 마른 풀들이 밟혀 있어. 저쪽에 천막 끝이 보여.',
            tent: '고개에 오르기 전에 낮은 바위 그늘이 있어. 어귀에서 물통도 챙겨 가렴.',
          } }),
          step('물통을 가져와 그늘을 확인하고 고개에서 전하자', 'follow', 'cup shade travelerRest', {
            at: { cup: { give: waterskin }, travelerRest: { take: waterskin } }, lines: {
              shade: '바위 뒤에 몸을 기대면 바람이 덜 불어. 여기라면 짐을 내려놓을 수 있겠어.',
              travelerRest: '물통 덕분에 한 모금 마시고 쉬었어. 이제 고개 너머까지 갈 수 있겠다.',
            } })),
      ],
    },
    {
      visual: 'nazareth', ambience: ['모험 장터', '모험 밤길', '모험 우물'],
      zones: ['해 저문 좌판 거리', '목공소 맞은편 골목', '우물과 무화과 그늘'],
      crossings: [[10, 7], [-8, -10.8]],
      spawn: [0, 17], word: [15.1, -18.2], photo: [-10.8, -15.7], secret: [-16.7, -19],
      stars: [[-18.6, 13.1], [11.3, -16.9], [18.8, -2.8]],
      starClues: ['문 닫은 좌판들 뒤, 서쪽 돌담 밑.', '우물에서 동쪽 낮은 턱 너머. 양과 넘거나 옆으로 돌아가 봐.', '골목 동쪽 끝에서 담 그림자를 따라가 봐.'],
      targets: {
        joseph: person('요셉', -3.4, 11.2), door: at('조용한 목공소 문', 1.9, -3.7, 'door'),
        neighbor: person('맞은편 이웃', -2.1, -5.8), child: person('골목 아이', 13.4, 17.3),
        waterNeighbor: person('우물가 이웃', -4.7, -15.7), bench: at('소리가 잦아드는 돌 의자', -13.5, -3.9, 'event'),
        peddler: person('좌판을 접는 상인', -10.7, 12.1), pin: at('돌담에 꽂힌 좌판 말뚝', 15.1, -5.9),
        figKeeper: person('무화과를 말리는 이웃', -12.5, -16.5), cat: animal('고양이', '발자국 끝에 웅크린 고양이', 11.6, -2.7),
        pawPrint: at('골목 먼지에 찍힌 작은 발자국', -13.9, -8.1, 'follow'),
        dyer: person('천을 물들이는 이웃', 15.4, 12), basin: at('무화과 그늘의 빈 대야', -14.3, -17.2),
        soap: at('좌판 옆에 둔 잿물 단지', -11.1, 17.35), rinse: at('골목 안쪽의 헹굼터', 11.7, -5.2, 'visit'),
        line: at('우물 뒤쪽의 빨랫줄', -10.2, -17.3, 'visit'),
      },
      steps: [
        step('좌판 거리에서 요셉을 만나자', 'talk', 'joseph', { line: '마리아가 거짓말할 사람은 아니야. 그건 아는데… 오늘은 손에 일이 안 잡혀.' }),
        step('목공소 앞에 가서 잠깐 귀를 기울여 보자', 'visit', 'door', { line: '늘 대패 소리가 나던 문 안쪽이 오늘은 조용해.' }),
        step('같은 저녁을 본 사람 셋의 이야기를 듣자', 'talk', 'neighbor child waterNeighbor', { lines: {
          neighbor: '해가 아직 남았는데 연장을 들여놓더라. 내가 본 건 그게 다야.',
          child: '아저씨가 내 옆을 두 번 지나쳤어. 두 번째에는 들고 있던 나무도 없었어.',
          waterNeighbor: '오늘은 얼굴이 어두워 보였어. 먼저 말할 때까지 기다려 주면 좋겠구나.',
        } }),
        step('골목 돌 의자에서 오늘 들은 말을 떠올려 보자', 'scene', 'bench', { line: '셋 다 같은 저녁을 봤어. 기억하는 장면은 조금씩 달랐어.' }),
        step('요셉에게 돌아가 이번엔 그의 말을 듣자', 'talk', 'joseph', { line: '나는 아직 뭐라고 해야 할지 모르겠어. 이렇게 옆에 앉아 준 것만으로도 좀 낫네.' }),
      ],
      sides: [
        side('좌판의 말뚝', step('좌판을 접는 상인에게 말을 걸자', 'talk', 'peddler', { line: '천막은 접었는데 말뚝 하나를 빼먹었어. 골목 동쪽 돌담에 꽂혀 있단다.' }),
          step('천막 말뚝을 가져다주자', 'follow', 'pin peddler', {
            at: { pin: { give: wedge }, peddler: { take: wedge } }, lines: { peddler: '내일 아침엔 이걸 먼저 박아야지. 챙겨 줘서 고맙다.' } })),
        side('무화과 접시의 발자국', step('무화과를 말리는 이웃의 이야기를 듣자', 'talk', 'figKeeper', { line: '접시 옆에 고양이 발자국이 찍혔어. 어디로 갔나 살펴봐 줄래?' }),
          step('발자국을 따라가 고양이를 찾아 알려 주자', 'follow', 'pawPrint cat figKeeper', {
            lines: { figKeeper: '따뜻한 돌 위에서 자고 있었구나. 무화과 접시는 집 안에 들여놔야겠다.' } })),
        side('물 빠지는 천', step('천을 물들이는 이웃의 이야기를 듣자', 'talk', 'dyer', {
          line: '푸른 천은 처음 빨 때 물이 빠져. 무화과 그늘에 따로 쓰는 대야가 있어.' }),
          step('대야와 잿물 단지를 챙겨 천을 헹구자', 'follow', 'basin soap rinse', {
            at: { basin: { give: washBasin }, soap: { give: cargo('잿물 단지', '🏺') }, rinse: { take: cargo('잿물 단지', '🏺'), give: cloth } },
            lines: { rinse: '한 번 더 헹구니 물이 제법 맑아졌어. 천만 꺼내 줄에 널면 돼.' },
          }),
          step('천을 널고 빈 대야를 돌려주자', 'follow', 'line dyer', {
            at: { line: { take: cloth }, dyer: { take: washBasin } },
            lines: { dyer: '햇빛은 내일 아침에 들 거야. 나머지 천에도 푸른 물이 안 들겠네.' },
          })),
      ],
    },
    {
      visual: 'workshop', ambience: ['모험 밤길', '작업장', '모험 밤길'],
      zones: ['작업장 바깥마당', '대팻밥이 쌓인 목공 마당', '작업대와 안쪽 방'],
      crossings: [[-9, 7], [7.5, -11]],
      spawn: [0, 17], word: [-15.1, -7.9], photo: [4.6, -17.1], secret: [-5.8, -17.6],
      stars: [[-20, 10.9], [12.2, -19.4], [19.3, -.5]],
      starClues: ['바깥마당 서쪽에서 장작이 드문 틈을 살펴봐.', '방 뒤편 낮은 돌턱 너머. 담 옆으로 돌아가도 돼.', '동쪽 마당에서 톱질하던 자리의 그늘을 살펴봐.'],
      targets: {
        joseph: person('요셉', -2.8, -16.6), scroll: at('두루마리를 펴 둔 돌상', -12.8, -5.2, 'visit'),
        shaving: at('대팻밥 안에 묻힌 조각', -14.7, 12),
        woodpile: at('장작 더미에서 빠진 조각', 13, -.9),
        fence: at('담장에 걸린 조각', 10.8, -18.4),
        threshold: at('등잔 곁의 문턱', -10.6, -17.6, 'event'),
        carrier: person('장작 나르는 일꾼', 10.7, 12.4), strap: at('돌상 옆 장작 끈', -14.2, -7.3),
        apprentice: person('견습 목수', 13.1, -15.7), hammer: at('바깥마당 선반의 나무 망치', -13.1, 17.45),
        joiner: person('걸상을 고치는 목수', -10.1, 17.35), stool: at('안쪽 방 곁의 흔들리는 걸상', 9, -15.5, 'visit'),
        measuringCord: at('어귀 선반에 놓인 치수 줄', 13.4, 17.65),
        offcut: at('대팻밥 아래 남은 널빤지', -15.4, -5.4),
        repair: at('걸상의 짧은 다리', 9, -16.1, 'visit'),
      },
      steps: [
        step('안쪽 방에서 요셉을 만나자', 'talk', 'joseph', { line: '밤새 읽어 봤어. 율법을 지키고 싶어. 마리아도 사람들 앞에 세우고 싶지 않아.' }),
        step('요셉이 읽던 두루마리를 살펴보자', 'visit', 'scroll', { line: '요셉이 오래 읽은 자리야. “의와 화평이 서로 입맞추었으며.”' }),
        step('마당과 담장에서 흩어진 나무 조각 세 개를 모으자', 'collect', 'shaving woodpile fence', { give: scraps }),
        step('요셉에게 나무 조각을 건네자', 'deliver', 'joseph', { take: scraps, takeCount: 3, line: '고마워. …이 일은 가만히 끝내기로 했어. 마리아 이야기를 밖에 내놓지 않고.' }),
        step('문턱에 놓인 등잔 곁까지 걸어가자', 'scene', 'threshold', { line: '요셉이 등을 돌려 불을 끈다. 마당에서 들리던 톱질 소리도 그쳤어.' }),
      ],
      sides: [
        side('풀린 장작 끈', step('장작을 나르는 일꾼의 부탁을 듣자', 'talk', 'carrier', { line: '장작 끈이 풀려서 한 묶음씩만 옮기고 있어. 돌상 옆에 새 끈을 두었어.' }),
          step('새 끈을 가져다주자', 'follow', 'strap carrier', {
            at: { strap: { give: rope }, carrier: { take: rope } }, lines: { carrier: '좋아. 두 번 감으면 돌아가는 길에도 안 풀리겠어.' } })),
        side('나무 망치', step('견습 목수에게 필요한 걸 묻자', 'talk', 'apprentice', { line: '나무 망치를 바깥 선반에 두고 왔어. 철망치로 치면 결이 상하거든.' }),
          step('선반에서 나무 망치를 찾아 가져다주자', 'follow', 'hammer apprentice', {
            at: { hammer: { give: cargo('나무 망치', '🔨') }, apprentice: { take: cargo('나무 망치', '🔨') } }, lines: { apprentice: '이거야. 이제 자국 없이 끼워 맞출 수 있겠다.' } })),
        side('흔들리는 걸상', step('걸상을 고치는 목수의 말을 듣자', 'talk', 'joiner', {
          line: '안쪽 방 걸상이 자꾸 흔들린대. 어느 쪽 다리가 짧은지 가서 봐 줄래?' }),
          step('흔들리는 쪽을 보고 맞는 나무를 찾자', 'follow', 'stool measuringCord offcut', {
            at: { offcut: { give: wedge } }, lines: {
              stool: '방 쪽 다리가 들어 올려져. 어귀 선반에 치수를 잴 줄이 있어.',
              measuringCord: '끈에 손톱으로 자국을 냈어. 이 길이만큼 되는 나무를 대팻밥 더미에서 찾아보자.',
            },
          }),
          step('다리에 나무를 대고 목수에게 알려 주자', 'follow', 'repair joiner', {
            at: { repair: { take: wedge } },
            lines: { repair: '나무를 받치고 걸상에 앉아 보니 더는 흔들리지 않아.', joiner: '내일은 거기에 앉아서 통나무도 편히 다듬겠어.' },
          })),
      ],
    },
    {
      visual: 'workshop', variant: 'dream', ambience: ['모험 밤길', '꿈', '꿈'],
      zones: ['등잔이 꺼진 바깥마당', '별빛이 내린 목공 마당', '지붕과 새벽 창가'],
      crossings: [[-9, 7], [7.5, -11]],
      spawn: [0, 17], word: [-11.2, -16.4], photo: [9.7, -19.3], secret: [0, -19.9],
      stars: [[-17.1, 10.3], [-7.9, -19.3], [19.7, -2.1]],
      starClues: ['등잔이 꺼진 서쪽 울타리 밑.', '지붕 서쪽의 낮은 턱 너머. 옆길도 이어져 있어.', '동쪽 장작 더미의 그늘에 빛이 한 점 남아 있어.'],
      fauna: [['고양이', [-2.7, 12.1]], ['비둘기', [4.1, -17.6]], ['나귀', [16, .5]]],
      targets: {
        window: at('등잔이 꺼진 요셉의 창', 1.8, 11.9, 'visit'),
        glow1: at('마당에 내려온 별빛', -10.3, 4.4, 'follow', { symbol: '✦' }),
        glow2: at('나뭇결을 타는 별빛', 12.7, -2.4, 'follow', { symbol: '✦', moving: true }),
        glow3: at('처마로 흐르는 별빛', -4.4, -16.5, 'follow', { symbol: '✦', moving: true }),
        voice: at('빛이 멈춘 자리', 3.4, -19.5, 'event'),
        joseph: { ...person('요셉', -1.3, 12.1, '잠에서 깬 요셉'), onlyWhenActive: true },
        watch: person('골목을 지키는 이웃', 12.6, 11.7), shutter: at('바람에 흔들리는 덧문', -14.7, -5.7, 'door'),
        keeper: person('장작 더미를 덮는 이웃', 13.9, -14.2), blanket: at('접어 둔 장작 덮개', -13.8, 12.3),
        lamplighter: person('밤길 등잔을 챙기는 사람', -10.2, 17.4), wind1: at('바람에 꺼진 어귀 등잔', 12.3, 17.5, 'visit'),
        wind2: at('그을음이 남은 담벼락', -15.8, -6.7, 'visit'), guardJar: at('처마 끝에 쌓아 둔 바람막이', 11.7, -19.6),
        windLamp: at('문턱을 비출 등잔', 1.8, 12.8, 'visit'),
      },
      steps: [
        step('요셉의 창가에서 등잔이 꺼졌는지 살펴보자', 'visit', 'window', { line: '불이 꺼지자 마당의 나뭇결 위로 작은 빛이 번져.' }),
        step('꿈속에서 움직이는 별빛을 따라가자', 'follow', 'glow1 glow2 glow3'),
        step('별빛이 멈춘 자리에 다가가 목소리를 듣자', 'scene', 'voice', {
          effect: 'star', line: '“다윗의 자손 요셉아. …마리아 데려오기를 무서워하지 말라.”' }),
        step('새벽의 요셉에게 돌아가자', 'talk', 'joseph', { line: '예수라 하라고 했어. 자기 백성을 죄에서 구원할 아이라고… 아직도 그 말이 들리는 것 같아.' }),
      ],
      sides: [
        side('바람에 흔들리는 덧문', step('골목을 지키는 이웃의 말을 듣자', 'talk', 'watch', { line: '바람만 불면 덧문이 쿵쿵 울려. 골목 건너에서 걸쇠를 밀어 줄래?' }),
          step('덧문 걸쇠를 밀고 이웃에게 알려 주자', 'follow', 'shutter watch', { lines: { watch: '조용해졌네. 이제 아침까지 눈 붙이는 사람도 있겠다.' } })),
        side('밤이슬과 장작', step('장작 더미를 덮는 이웃의 부탁을 듣자', 'talk', 'keeper', { line: '장작이 밤이슬을 맞겠어. 바깥마당에 덮개가 있으니 가져다주렴.' }),
          step('장작 덮개를 가져다주자', 'follow', 'blanket keeper', {
            at: { blanket: { give: cloth }, keeper: { take: cloth } }, lines: { keeper: '이제 내일 아침에 불을 피울 수 있겠구나.' } })),
        side('문턱을 비출 불', step('등잔을 챙기는 사람과 이야기하자', 'talk', 'lamplighter', {
          line: '문턱에서 발을 헛디딜 뻔했어. 어귀 등잔이 왜 꺼졌는지 살펴봐 줄래?' }),
          step('꺼진 등잔에서 담을 지나 바람의 방향을 살피자', 'follow', 'wind1 wind2', { lines: {
            wind1: '기름은 남아 있어. 불꽃만 옆으로 길게 누웠던 모양이야.',
            wind2: '그을음이 담 안쪽에만 묻어 있어. 이 틈에서 불던 바람이 길을 건너갔어.',
          } }),
          step('처마의 바람막이를 씌우고 등잔이 켜졌다고 전하자', 'follow', 'guardJar windLamp lamplighter', {
            at: { guardJar: { give: cargo('등잔 바람막이', '🏺') }, windLamp: { take: cargo('등잔 바람막이', '🏺') } },
            lines: { windLamp: '가리개 너머로 불꽃이 가만히 서 있어.', lamplighter: '문 앞 돌부리까지 보이네. 잘했어.' },
          })),
      ],
    },
    {
      visual: 'galilee', ambience: ['모험 산길', '모험 지붕', '모험 산길'],
      zones: ['회당에서 오르는 길', '올리브 밭', '호수가 보이는 능선'],
      crossings: [[-9, 7], [8, -11.5]],
      spawn: [0, 17], word: [-14.4, -16.6], photo: [3.5, -19], secret: [16.2, -19.3],
      stars: [[-18.8, 10.7], [-8.7, -19.7], [18.8, -5.1]],
      starClues: ['오르막 서쪽, 뿌리가 길 위로 드러난 곳.', '능선 서쪽 낮은 턱을 넘어 봐. 턱을 끼고 돌아가도 돼.', '밭의 동쪽 끝에서 가장 키 작은 나무 주변.'],
      targets: {
        joseph: person('요셉', -2.9, 13.6), farmer: person('올리브 밭 주인', -8.8, 3),
        fruit1: at('첫 올리브나무 밑 열매', -8.1, 1.2, 'find', { symbol: '🫒' }),
        fruit2: at('밭고랑에 떨어진 열매', -4.5, -1.7, 'find', { symbol: '🫒' }),
        fruit3: at('낮은 가지 밑 열매', -.4, -4.7, 'find', { symbol: '🫒' }),
        fruit4: at('돌무더기 곁 열매', 3.8, -7.3, 'find', { symbol: '🫒' }),
        fruit5: at('능선으로 오르는 길의 열매', 8.1, -8.7, 'find', { symbol: '🫒' }),
        basket: at('열매를 모아 두는 바구니', 12, -7.2, 'visit'),
        overlook: at('갈릴리 능선의 바위', 5.7, -16.7, 'event'),
        grower: person('묘목을 심는 이웃', -11.7, 13.1), stake: at('능선에 모아 둔 지주대', -11.2, -17.8),
        pilgrim: person('회당에서 올라온 어른', 13.8, -15.9), shade: at('바람을 막아 주는 쉼터', 12.4, 3.6, 'visit'),
        shepherd: person('비탈의 양치기', 10.2, 14.2), bleat: at('울음이 메아리치는 낮은 담', -13.1, -7.1, 'follow'),
        kid: animal('염소', '능선에 홀로 선 새끼 염소', 12.8, -19),
        trough: at('밭 아래 돌 여물통', 15.2, .9, 'visit'),
      },
      steps: [
        step('언덕 어귀에서 요셉과 이야기하자', 'talk', 'joseph', { line: '눈을 뜨자 회당에서 들은 말씀이 떠올랐어. 이사야가 뭐라고 했는지 다시 보고 싶어.' }),
        step('올리브 밭 주인과 이야기를 나누자', 'talk', 'farmer', { line: '나무 아래 떨어진 열매를 잠깐 주워 줄래? 요 앞 고랑부터 능선 아래까지야.' }),
        step('40초 안에 밭에서 올리브 다섯 알을 주워 보자', 'timed', 'fruit1 fruit2 fruit3 fruit4 fruit5', {
          start: 'farmer', seconds: 40, title: '올리브 다섯 알', intro: '가까운 나무부터 고랑을 따라 올라가 봐. 40초 동안 떨어진 열매 다섯 알을 주우면 돼.',
          give: cargo('올리브', '🫒'), giveAtEnd: true, amount: 5,
        }),
        step('올리브를 바구니에 담고 능선의 말씀 비석을 읽자', 'follow', 'basket word', {
          at: { basket: { take: cargo('올리브', '🫒'), takeCount: 5 } },
          lines: { basket: '다섯 알이 바구니 바닥에 톡톡 떨어져. 말씀 비석은 마른 돌담 너머에 있어.' },
        }),
        step('능선을 돌아 내려와 요셉과 말씀을 나누자', 'follow', 'overlook joseph', { lines: {
          overlook: '발아래 작게 보이는 집들 사이로 아침 연기가 올라와.',
          joseph: '임마누엘. 하나님이 우리와 함께 계신다는 말이잖아. …나 마리아한테 가 볼게.',
        } }),
      ],
      sides: [
        side('바람을 맞는 묘목', step('묘목을 심는 이웃의 부탁을 듣자', 'talk', 'grower', { line: '어린 나무가 바람에 자꾸 기울어. 능선에 묶어 둔 막대기 하나 가져와 줄래?' }),
          step('능선에서 지주대를 가져다주자', 'follow', 'stake grower', {
            at: { stake: { give: wedge }, grower: { take: wedge } }, lines: { grower: '곁에 받쳐 놓으면 뿌리내릴 때까지 견딜 수 있겠어.' } })),
        side('바람이 덜 드는 쉼터', step('회당에서 온 어른에게 말을 걸자', 'talk', 'pilgrim', { line: '벌써 여기까지 올라왔구나. 잠깐 쉬었다 갈 만한 자리가 어디 있니?' }),
          step('바람이 덜 드는 자리를 찾아 알려 드리자', 'follow', 'shade pilgrim', { lines: { pilgrim: '밭 옆 바위 뒤구나. 다리에 힘이 돌아올 때까지 거기 앉아야겠어.' } })),
        side('능선에 남은 새끼 염소', step('비탈의 양치기에게 무슨 일인지 묻자', 'talk', 'shepherd', {
          line: '다 데려온 줄 알았는데 한 마리가 안 보여. 밭 위에서 울음이 들려.' }),
          step('울음소리를 따라 새끼 염소를 찾아 양치기에게 데려가자', 'escort', 'bleat kid trough shepherd', {
            passenger: 'kid', lines: {
              bleat: '담 아래에선 소리가 가장 커. 고개를 들자 능선 위에 뿔 하나가 보여.',
              kid: '풀을 내밀자 새끼 염소가 조심스럽게 가까이 와.',
              trough: '여물통 옆에서 잠깐 쉬자 새끼 염소가 풀을 한입 뜯었어.',
              shepherd: '바위에 발이 끼었나 싶었어. 온 길을 그대로 내려와서 다행이다.',
            },
          })),
      ],
    },
    {
      visual: 'nazareth', variant: 'wedding', ambience: ['모험 뜰', '모험 장터', '모험 밤길'],
      zones: ['혼인 골목 입구', '꽃잎이 흩어진 돌담길', '새집과 뒤뜰'],
      crossings: [[-9, 7], [7, -11]],
      spawn: [0, 17], word: [-12.7, -15.4], photo: [5.5, -18.1], secret: [17.2, -19.2],
      stars: [[-19.3, 10.7], [-9.5, -18.9], [19.4, -1.1]],
      starClues: ['골목 입구에서 서쪽 담을 따라 걸어 봐.', '새집 서쪽의 낮은 턱 뒤. 담 끝으로도 길이 나 있어.', '꽃잎이 잘 날리지 않는 골목 동쪽 담 아래.'],
      targets: {
        joseph: person('요셉', -3.4, 13.8), maria: person('마리아', -12.6, -4.2, '마리아네 문 앞'),
        lantern1: at('골목 입구 등불', 9.5, 12.1, 'light'),
        lantern2: at('굽이 돌담 등불', -7.4, 3.3, 'light'),
        lantern3: at('새집 앞 등불', 2, -15.2, 'light'),
        petal1: at('돌담 밑의 흰 꽃잎', 14.7, -3.4, 'find', { symbol: '🌸' }),
        petal2: at('집 앞에 내려앉은 흰 꽃잎', 11.4, -16.2, 'find', { symbol: '🌸' }),
        door: at('꽃잎을 놓는 새집 문턱', -.2, -18, 'door'),
        welcome: at('함께 켜는 창가 등잔', -4.2, -17.5, 'event'),
        baker: person('빵을 굽는 이웃', -11.4, 11.8), breadTable: at('새집 앞 빵 놓을 자리', 13.7, -15.9, 'visit'),
        helper: person('행렬을 맞는 이웃', 12.6, -15.1), garland: at('골목에 떨어진 꽃줄', -14.1, 5.35),
        potter: person('토기 잔을 빌려주는 이웃', 12.1, 17.35), blueCup: at('담장에 남은 푸른 잔', -14.3, -5.6),
        stripedCup: at('새집 옆에 남은 줄무늬 잔', 12.6, -17.8),
        clayCup: at('서쪽 어귀의 손잡이 없는 잔', -11, 17.3), wash: at('새집 마당 잔 헹구는 자리에 놓기', 9.2, -14.6, 'visit'),
      },
      steps: [
        step('골목 입구에서 요셉과 만나자', 'talk', 'joseph', { line: '사람들이 좀 보고 있어. 그래도 가야지. 마리아네 문은 저 굽이 안쪽이야.' }),
        step('마리아네 문 앞에 가자', 'talk', 'maria', { line: '요셉이 같이 가자고 했어요. 그 말을 듣고 나니까 문 밖으로 한 걸음이 떼어졌어요.' }),
        step('행렬이 지나갈 골목의 등불 세 개를 밝히자', 'light', 'lantern1 lantern2 lantern3', { intro: '어귀와 굽이, 새집 앞에 등불이 하나씩 있어. 불을 붙이면 지나갈 길이 보일 거야.' }),
        step('흰 꽃잎 두 장을 줍고 마리아와 새집으로 가자', 'escort', 'petal1 petal2 maria door', {
          passenger: 'maria',
          at: { petal1: { give: flowers }, petal2: { give: flowers }, door: { take: flowers, takeCount: 2 } },
          lines: { maria: '요셉이 저 앞에서 기다리고 있어요. 같이 새집까지 걸어가요.', door: '마리아가 문턱을 넘어가. 아까 주운 흰 꽃잎을 문 옆에 내려놓았어.' },
        }),
        step('새집 창가에서 함께 켠 불을 보자', 'scene', 'welcome', { effect: 'spark', line: '두 사람이 나란히 등잔 옆에 앉아 있어. 곧게 단 문 아래로 불빛 한 줄이 새어 나와.' }),
      ],
      sides: [
        side('이웃이 구운 빵', step('빵을 굽는 이웃에게 빵을 받자', 'get', 'baker', {
          give: cargo('갓 구운 빵', '🥖'), line: '가는 길이면 빵 한 덩이 좀 가져다주렴. 새집 앞에 놓으면 알아볼 거야.' }),
          step('새집 앞에 빵을 놓아 두자', 'deliver', 'breadTable', { take: cargo('갓 구운 빵', '🥖'), line: '아직 따뜻한 빵을 문 앞의 바구니에 놓았어.' })),
        side('풀린 꽃줄', step('행렬을 맞는 이웃의 말을 듣자', 'talk', 'helper', { line: '꽃줄 한 끝이 바람에 날아갔어. 아래쪽 담에 걸렸으면 가져다줄 수 있니?' }),
          step('꽃줄을 찾아 건네자', 'follow', 'garland helper', {
            at: { garland: { give: cargo('흰 꽃줄', '🌼') }, helper: { take: cargo('흰 꽃줄', '🌼') } }, lines: { helper: '다시 묶었어. 이제 문을 열어도 꽃이 떨어지지 않겠다.' } })),
        side('빌려준 토기 잔', step('토기 잔을 빌려주는 이웃의 이야기를 듣자', 'talk', 'potter', {
          line: '물 마시라고 잔 셋을 꺼냈는데 길 곳곳에 남았어. 그림이 서로 달라서 금방 알아볼 거야.' }),
          step('골목에서 잔 세 개를 모아 새집 마당에서 헹구자', 'follow', 'blueCup stripedCup clayCup wash', {
            give: cargo('토기 잔', '🏺'),
            at: { wash: { give: null } }, lines: { wash: '세 잔을 헹구어 겹쳤어. 토기장이의 물레가 있는 곳으로 가져가자.' },
          }),
          step('헹군 토기 잔을 돌려주자', 'deliver', 'potter', { take: cargo('토기 잔', '🏺'), takeCount: 3,
            line: '셋 다 돌아왔네. 다음에 목마른 사람이 오면 또 내놓아야지.' })),
      ],
    },
    {
      visual: 'well', carry: fullJug.name, ambience: ['모험 뜰', '모험 우물', '집안'],
      zones: ['물동이를 모아 둔 마당', '마을 우물', '요셉과 마리아의 집'],
      crossings: [[-8, 8], [7.5, -10]],
      spawn: [0, 17], word: [-13.8, -17.55], photo: [3.4, -17.1], secret: [2.7, -2.3],
      stars: [[-18.1, 10.3], [11.2, -19.3], [19.6, -1.6]],
      starClues: ['빈 물동이 마당 서쪽의 오래된 담 아래.', '새집 뒤 낮은 턱 건너. 옆길을 걷거나 양과 폴짝 넘어 봐.', '우물에서 물 흘린 자국을 동쪽까지 따라가 봐.'],
      targets: {
        joe: person('요셉', 5.2, 12.8), water1: at('우물에서 첫 물동이 채우기', 2.2, .64, 'find', { symbol: '🏺' }),
        water2: at('우물에서 둘째 물동이 채우기', 2.2, .64, 'find', { symbol: '🏺' }),
        water3: at('우물에서 셋째 물동이 채우기', 2.2, .64, 'find', { symbol: '🏺' }),
        basin1: at('집 앞에 첫 물동이 내려놓기', 5.5, -14.4, 'door'),
        basin2: at('집 앞에 둘째 물동이 내려놓기', 5.5, -14.4, 'door'),
        basin3: at('집 앞에 셋째 물동이 내려놓기', 5.5, -14.4, 'door'),
        maria: person('마리아', 2.9, -17.3, '등잔을 켜는 마리아'),
        potter: person('토기를 빚는 이웃', -12.5, 17.35), lid: at('우물 건너 놓아 둔 토기 뚜껑', 14.2, -5.1),
        keeper: person('두레박을 살피는 사람', 5.9, -.5), coil: at('마당 선반에 감아 둔 새 줄', 13.9, 17.5),
        lampNeighbor: person('심지를 꼬는 이웃', -12.1, -15.5), flax: at('빈 물동이 옆의 삼실 꾸러미', -15.7, 13.4),
        cutting: at('우물 옆 심지를 재는 돌', -12.7, -5.8, 'visit'), oil: at('동쪽 어귀 좌판의 작은 기름병', 12, 17.5),
        guestLamp: at('새집 창가의 작은 등잔', 7.8, -18, 'visit'),
      },
      steps: [
        step('물동이 마당에서 요셉에게 말을 걸자', 'talk', 'joe', { line: '집에 쓸 물이 모자라. 우물에서 한 동이씩 나르면 세 번이면 되겠다.' }),
        step('우물에서 집까지 물동이를 세 번 나르자', 'follow', 'water1 basin1 water2 basin2 water3 basin3', {
          at: { water1: { give: fullJug }, basin1: { take: fullJug }, water2: { give: fullJug }, basin2: { take: fullJug }, water3: { give: fullJug }, basin3: { take: fullJug } },
          lines: { basin1: '첫 동이를 문 옆에 놓았어. 창가에는 아직 빈 자리가 둘 있어.', basin3: '세 동이가 나란히 놓였어. 문 안에서 등잔 켜는 소리가 나.' },
        }),
        step('집에서 등잔을 켜는 마리아를 만나자', 'talk', 'maria', { line: '고마워요. 요셉은 물 길으러 가면서도 그 이름을 작게 불러 봐요. 예수, 하고.' }),
        step('새집 옆 말씀 비석을 읽자', 'visit', 'word'),
        step('요셉과 함께 아기의 이름을 불러 보자', 'talk', 'joe', {
          line: '예수야. …아기가 태어나면 내가 이 이름을 부를 거야. 오늘은 이렇게 한 번 더 불러 보고.',
        }),
      ],
      sides: [
        side('토기 뚜껑 짝 맞추기', step('토기를 빚는 이웃의 부탁을 듣자', 'talk', 'potter', { line: '큰 항아리엔 그 넓적한 뚜껑이 꼭 맞아. 우물 건너 돌 위에 놓아 뒀단다.' }),
          step('토기 뚜껑을 찾아 가져다주자', 'follow', 'lid potter', {
            at: { lid: { give: cargo('토기 뚜껑', '🟤') }, potter: { take: cargo('토기 뚜껑', '🟤') } }, lines: { potter: '잘 맞는다. 이제 물에 먼지가 안 들어가겠어.' } })),
        side('두레박의 해진 줄', step('두레박을 살피는 사람의 말을 듣자', 'talk', 'keeper', { line: '밧줄 끝이 헤졌어. 마당 선반에 새 줄을 감아 뒀으니 가져다주렴.' }),
          step('새 두레박 줄을 가져다주자', 'follow', 'coil keeper', {
            at: { coil: { give: rope }, keeper: { take: rope } }, lines: { keeper: '고맙다. 매듭 두 번이면 다음 사람도 안전하게 물을 긷겠어.' } })),
        side('밝혀 두는 창가 등잔', step('심지를 꼬는 이웃을 만나자', 'talk', 'lampNeighbor', {
          line: '새집 창가에 등잔 하나를 더 두기로 했어. 빈 물동이 옆의 삼실을 찾아 와 줄래?' }),
          step('삼실을 찾아 우물 옆 돌에서 길이를 재자', 'follow', 'flax cutting', {
            at: { flax: { give: cargo('삼실', '🧵') }, cutting: { take: cargo('삼실', '🧵'), give: cargo('심지', '🧵') } },
            lines: { cutting: '삼실 두 가닥을 꼬아서 등잔 심지를 만들었어. 등잔에는 기름도 필요해.' },
          }),
          step('기름까지 챙겨 새집 창가 등잔을 준비하자', 'follow', 'oil guestLamp lampNeighbor', {
            at: { oil: { give: oilJar }, guestLamp: { take: oilJar }, lampNeighbor: { take: cargo('심지', '🧵') } },
            lines: { guestLamp: '등잔에 기름을 부었어. 이제 심지를 끼우면 돼.', lampNeighbor: '이제 창가에 불을 밝혀 둘 수 있겠네. 늦게 오는 이웃도 보라고.' },
          })),
      ],
    },
  ];

  const adventures = [...days.map((day, index) => ['1-' + index, day]), ...peaceDays.map((day, index) => ['2-' + index, day])];
  for (const [id, adventure] of adventures) {
    const index = +id.at(-1), hope = id.startsWith('1-');
    const area = window.EXPLORE[id], { targets, visual, word, photo, secret, stars, time, variant } = adventure;
    const inherited = area.markers.filter(m => ['verse', 'secret', 'photo'].includes(m.type));
    const uphill = visual === 'temple' || visual === 'sanctuary';
    const cart = !hope ? [17.5, 5.65] : index === 5 ? [-6.55, 6.6] : [16.8, 2.5];
    const jump = [stars[1][0], stars[1][1] + 1.55];
    const shine = hope && index === 5 ? [-11.8, -16.15] : [secret[0] + (secret[0] > 17 ? -2.65 : 2.9), Math.max(-20, secret[1] + 1.65)];
    for (const marker of inherited) {
      const pos = { word, photo, secret, 'extra-word': [10.95, -12.3] }[marker.id];
      targets[marker.id] = { ...marker, pos, title: marker.id === 'photo' ? '여정 사진 찍기' : marker.title };
    }
    Object.assign(targets, {
      'star-1': at('성벽 틈의 별 조각', ...stars[0], 'fragment', { hidden: true, clue: uphill ? '바깥뜰 서쪽의 긴 성벽을 따라 걸어 봐.' : '마을 왼쪽 돌담 밑에 작은 틈이 있어.' }),
      'star-2': at('높은 턱 너머 별 조각', ...stars[1], 'fragment', { hidden: true, clue: '북쪽 높은 턱은 옆길로 돌아가도 돼. 어린 양이면 낮은 턱을 뛸 수 있어.' }),
      'star-3': at(hope && index === 0 ? '우물 뒤 별 조각' : '그늘의 별 조각', ...stars[2], 'fragment',
        { hidden: true, clue: index === 0 ? '우물에서 물 소리가 가장 또렷한 쪽을 살펴봐.' : '동쪽의 인적 드문 그늘을 살펴봐.' }),
      jump: at('낮은 담', ...jump, 'ability', { feature: 'jump' }),
      push: at(hope && index === 5 ? '짐이 실린 나귀 수레' : '길을 막은 수레', ...cart, 'ability', { feature: 'push' }),
      shine: at('빛이 닿지 않는 틈', ...shine, 'ability', { feature: 'shine' }),
      'cart-cache': at('수레 뒤에 남은 기름', cart[0] - 1.05, cart[1] - 1.15, 'cache', { hidden: true }),
      'light-cache': at('빛이 비친 작은 기름병', shine[0] - .93, shine[1] + 1.18, 'cache', { hidden: true }),
    });
    if (!hope) for (const [i, clue] of adventure.starClues.entries()) {
      const star = targets['star-' + (i + 1)];
      star.title = ['담 아래 별 조각', '낮은 턱 너머 별 조각', '그늘에 숨은 별 조각'][i];
      star.clue = clue;
    }
    if (time) area.layout.time = time;
    if (variant) area.layout.adventureVariant = variant;
    adventure.crossings ||= [[[-11, 11.25], [10, -11.85]], [[-11, 6.8], [5.1, -10.9]],
      [[10.5, 8.2], [-12.8, -11.85]], [[-11.2, 6.8], [10.2, -11.85]],
      [[10.5, 7.25], [-9.75, -12.0]], [[-10.6, 7.9], [11.15, -11.9]],
      [[10.5, 6.8], [-5.2, -10.8]]][index];
    area.adventure = adventure;
    area.steps = adventure.steps;
    area.markers = inherited.map(marker => ({ id: marker.id, ...targets[marker.id] }));
  }

  /* ---------- 발견 탐험 도감 & 첫 주 7곳 배치 (plans/03-발견-탐험.md) ---------- */
  const DISCOVER_THEMES = [
    { id: 'temple', name: '성전과 예배', icon: '🏛️', badge: '성전의 등불지기', item: '흰 깃털 핀' },
    { id: 'home', name: '집과 살림', icon: '🏠', badge: '유대 집 살림꾼', item: '등불 목걸이' },
    { id: 'work', name: '일과 연장', icon: '🛠️', badge: '손끝이 야무진 사람', item: '나무 뿔 장식' },
    { id: 'road', name: '길과 여행', icon: '🌿', badge: '유대 길 나그네', item: '목자 지팡이' },
    { id: 'field', name: '들과 목자', icon: '🐑', badge: '들판의 친구', item: '작은 날개' },
    { id: 'christmas', name: '성탄의 밤', icon: '⭐', badge: '그 밤의 증인', item: '은 왕관' }
  ];

  const DISCOVERIES = {
    // 성전과 예배
    'solomon-colonnade': {
      title: '솔로몬 행각', kind: 'look', theme: 'temple', prop: 'colonnade', cue: 'worship', icon: '🏛️',
      fact: '성전 뜰을 둘러싼 긴 지붕 회랑이야. 사람들이 모여 가르침을 듣던 곳이었어.',
      ref: '요 10:23', sheep: '기둥 그늘이 길게 뻗어 있네. 발소리도 울려.'
    },
    'dove-seller': {
      title: '비둘기 파는 사람', kind: 'touch', theme: 'temple', prop: 'doves', anim: 'doves', cue: 'animal', icon: '🕊️',
      fact: '가난한 사람은 양 대신 비둘기 두 마리를 제물로 드릴 수 있었어.',
      ref: '레 12:8; 눅 2:24', touchLine: '비둘기들이 푸드덕 날아올랐어!', sheep: '우와, 흰 날개가 머리 위로 지나갔어!'
    },
    'money-changer': {
      title: '환전상의 상', kind: 'look', theme: 'temple', prop: 'coins', cue: 'worship', icon: '🪙',
      fact: '성전세는 정해진 은전으로 내야 해서, 순례자들은 여기서 돈을 바꿨어.',
      sheep: '동전 부딪히는 짤랑 소리에 귀가 쫑긋 서네.'
    },
    'incense-altar': {
      title: '향단의 향', kind: 'try', theme: 'temple', prop: 'incense', cue: 'fire', icon: '🌿',
      tryMode: 'hold', tryPrompt: '향단 위를 길게 눌러 향을 천천히 올려 봐.', tryBtn: '향 올리기',
      bag: { name: '향기 나는 향', icon: '🌿' },
      fact: '아침저녁 분향할 제사장은 제비로 뽑았고, 평생 한 번 할까 말까 한 일이었어.',
      ref: '눅 1:9', sheep: '은은한 향기가 코끝에 닿아. 숨이 고요해져.'
    },
    menorah: {
      title: '일곱 등잔대(메노라)', kind: 'look', theme: 'temple', prop: 'menorah', cue: 'fire', icon: '🕎',
      fact: '성소 안을 밝히던 금 등잔대야. 꺼지지 않게 매일 기름을 채웠어.',
      ref: '출 27:20', sheep: '일곱 불빛이 금빛으로 반짝여서 눈이 부셔.'
    },
    'temple-trumpet': {
      title: '나팔 소리', kind: 'touch', theme: 'temple', prop: 'trumpet', anim: 'trumpet', cue: 'worship', icon: '🎺',
      fact: '예배와 절기를 알릴 때 나팔을 불었어.',
      ref: '민 10:10', touchLine: '맑은 나팔 소리가 성전 뜰로 퍼졌어!', sheep: '깜짝이야! 나팔 소리가 뜰 끝까지 울려.'
    },
    'priest-linen': {
      title: '제사장의 흰 세마포 옷', kind: 'look', theme: 'temple', prop: 'linen', cue: 'wool', icon: '👘',
      fact: '제사장은 고운 흰 베옷을 입고 섬겼어.',
      sheep: '내 털보다 훨씬 곱고 하얀 옷이네.'
    },
    'ascent-steps': {
      title: '올라가는 계단', kind: 'look', theme: 'temple', prop: 'steps', cue: 'worship', icon: '🪜',
      fact: '순례자들은 성전에 오르며 \'성전에 올라가는 노래\'(시편 120~134편)를 불렀대.',
      sheep: '한 계단씩 오를 때마다 노랫소리가 들리는 것 같아.'
    },
    mikveh: {
      title: '정결례 웅덩이', kind: 'look', theme: 'temple', prop: 'mikveh', cue: 'water', icon: '💧',
      fact: '성전에 들어가기 전 몸을 씻던 계단식 물웅덩이야.',
      sheep: '계단 아래로 맑은 물이 고여 있어. 발끝이 시원해 보여.'
    },
    'waiting-court': {
      title: '사람들이 기다리는 뜰', kind: 'touch', theme: 'temple', prop: 'pray', anim: 'pray', cue: 'worship', icon: '🙏',
      fact: '분향하는 동안 백성은 밖에서 기도했어.',
      ref: '눅 1:10', touchLine: '뜰에 모인 사람들이 조용히 두 손을 모았어.', sheep: '나도 발소리를 줄이고 옆에 가만히 서 있을게.'
    },

    // 집과 살림
    'flat-roof': {
      title: '평평한 지붕과 난간', kind: 'look', theme: 'home', prop: 'roof', cue: 'road', icon: '🏡',
      fact: '지붕은 평평해서 말리고, 기도하고, 여름엔 자기도 했어. 떨어지지 않게 난간을 둘렀지.',
      ref: '신 22:8', sheep: '바람이 시원하게 불어! 난간이 있어서 안심이야.'
    },
    'oil-lamp': {
      title: '기름 등잔', kind: 'try', theme: 'home', prop: 'lamp', cue: 'fire', icon: '🪔',
      tryMode: 'order', tryPrompt: '기름 붓기 → 심지 놓기 → 불 붙이기 순서로 눌러 봐.', tryBtn: '다음 단계',
      bag: { name: '불 켠 등잔', icon: '🪔' },
      fact: '손바닥만 한 진흙 등잔에 올리브기름을 부어 불을 켰어.',
      sheep: '작은 등잔인데 불이 켜지니까 주변이 확 따뜻해졌어.'
    },
    'clay-oven': {
      title: '진흙 화덕에 빵 굽기', kind: 'try', theme: 'home', prop: 'oven', cue: 'food', icon: '🫓',
      tryMode: 'tap', tryPrompt: '반죽을 톡톡 펴서 화덕 벽에 붙이고 노릇하게 뒤집어 봐.', tryBtn: '톡톡 굽기',
      bag: { name: '납작한 빵', icon: '🫓' },
      fact: '둥근 화덕 안쪽 벽에 납작한 반죽을 붙여 구웠어.',
      sheep: '킁킁! 고소한 빵 냄새가 화덕에서 솔솔 나!'
    },
    'water-jar': {
      title: '물 항아리', kind: 'look', theme: 'home', prop: 'jar', cue: 'water', icon: '🏺',
      fact: '하루 쓸 물을 우물에서 길어 와 큰 항아리에 담아 두었어.',
      sheep: '항아리 겉이 서늘하네. 물이 가득 담겼나 봐.'
    },
    'wax-tablet': {
      title: '밀랍 서판', kind: 'touch', theme: 'home', prop: 'tablet', anim: 'scribe', cue: 'craft', icon: '📝',
      fact: '나무판에 밀랍을 입혀 뾰족한 막대로 글을 썼다 지웠다 했어.',
      ref: '눅 1:63', touchLine: '밀랍 위에 뾰족한 막대로 글자를 또박또박 새겼어.', sheep: '사각사각 소리 나네. 다 쓰고 밀면 다시 지워진대!'
    },
    'mud-brick': {
      title: '진흙 벽돌과 돌 벽', kind: 'look', theme: 'home', prop: 'brick', cue: 'craft', icon: '🧱',
      fact: '산지 집은 돌로, 낮은 곳 집은 햇볕에 말린 벽돌로 지었어.',
      sheep: '햇볕을 머금은 벽이 꽤 단단해 보여.'
    },
    'empty-cradle': {
      title: '빈 요람', kind: 'touch', theme: 'home', prop: 'cradle', anim: 'sway', cue: 'baby', icon: '🛏️',
      fact: '오래 아이를 기다린 집이야. 조용히 흔들어 볼 수 있어.',
      touchLine: '빈 요람이 천천히 흔들리며 나무 소리를 냈어.', sheep: '요람 옆에서 발소리를 낮추고 가만히 바라보고 있어.'
    },
    'water-carry': {
      title: '물동이 이기', kind: 'touch', theme: 'home', prop: 'water', anim: 'balance', cue: 'water', icon: '🏺',
      fact: '물동이를 머리에 이고 균형을 잡아 집까지 날랐어.',
      touchLine: '물동이가 살짝 출렁이다가 딱 균형을 잡았어!', sheep: '우와, 한 방울도 안 흘리고 걷다니 대단해!'
    },
    'courtyard-hill': {
      title: '산골 집 마당', kind: 'look', theme: 'home', prop: 'terrace', cue: 'road', icon: '🏘️',
      fact: '유대 산지 마을의 돌집과 안뜰이야.',
      sheep: '돌담 안쪽 마당이 아늑해. 여기서 같이 쉬어도 좋겠다.'
    },
    'swaddle-wrap': {
      title: '아기 강보 싸기', kind: 'try', theme: 'home', prop: 'swaddle', cue: 'baby', icon: '🧣',
      tryMode: 'wrap', tryPrompt: '천을 좌우로 감아 아기 강보를 단단히 싸 봐.', tryBtn: '천 감기',
      bag: { name: '아기 강보', icon: '🧣' },
      fact: '갓난아기는 천으로 단단히 감싸 주었어.',
      ref: '눅 2:7', sheep: '포근하게 감겼네. 아기가 따뜻하게 자겠다.'
    },

    // 일과 연장
    millstone: {
      title: '맷돌', kind: 'try', theme: 'work', prop: 'millstone', cue: 'food', icon: '⚙️',
      tryMode: 'spin', tryPrompt: '손잡이를 잡고 원을 그리며 맷돌을 돌려 봐.', tryBtn: '맷돌 돌리기',
      bag: { name: '고운 밀가루', icon: '🌾' },
      fact: '위아래 돌 두 개로 곡식을 갈아 가루를 냈어. 보통 여자 둘이 마주 앉아 돌렸대.',
      ref: '마 24:41', sheep: '돌 사이로 하얀 가루가 나와! 코끝에 곡식 냄새가 킁킁.'
    },
    'carpenter-plane': {
      title: '대패·끌·활비비', kind: 'try', theme: 'work', prop: 'carpenter', cue: 'craft', icon: '🪚',
      tryMode: 'rub', tryPrompt: '손가락으로 나무 위를 문질러 매끈하게 다듬어 봐.', tryBtn: '나무 다듬기',
      bag: { name: '매끈한 나무판', icon: '🪵' },
      fact: '목수는 집의 문틀·대들보, 쟁기와 멍에도 만들었어.',
      sheep: '대팻밥이 돌돌 말려 나와! 나무 향이 좋다.'
    },
    'olive-press': {
      title: '올리브기름 짜는 틀', kind: 'try', theme: 'work', prop: 'olivepress', cue: 'food', icon: '🫒',
      tryMode: 'spin', tryPrompt: '돌을 둥글게 굴려 올리브에서 기름을 짜 봐.', tryBtn: '돌 굴리기',
      bag: { name: '올리브기름 병', icon: '🫒' },
      fact: '올리브를 으깨고 눌러 기름을 냈어. 등잔·요리·약에 다 썼지.',
      sheep: '초록빛 기름이 또르르 떨어져. 등잔에 쓰면 딱이겠다!'
    },
    'well-bucket': {
      title: '우물에서 물 긷기', kind: 'try', theme: 'work', prop: 'well', cue: 'water', icon: '🪣',
      tryMode: 'pull', tryPrompt: '두레박 줄을 아래로 쭉쭉 당겨 물을 길어 올려 봐.', tryBtn: '줄 당기기',
      bag: { name: '물동이', icon: '🏺' },
      fact: '물 긷기는 주로 아침저녁, 마을 소식이 오가는 자리였어.',
      sheep: '첨벙! 시원한 우물물이 가득 올라왔어.'
    },
    'loom-spindle': {
      title: '베틀과 실잣기', kind: 'try', theme: 'work', prop: 'loom', cue: 'wool', icon: '🧶',
      tryMode: 'spin', tryPrompt: '가락을 빙글빙글 돌려 양털로 실을 꼬아 봐.', tryBtn: '가락 돌리기',
      bag: { name: '실 한 타래', icon: '🧶' },
      fact: '양털을 가락으로 꼬아 실을 만들고 베틀로 천을 짰어.',
      sheep: '어, 내 털이랑 똑같아! 이 실로 옷도 짤 수 있겠다.'
    },
    winepress: {
      title: '포도 따서 포도즙 틀에 밟기', kind: 'try', theme: 'work', prop: 'winepress', cue: 'food', icon: '🍇',
      tryMode: 'stomp', tryPrompt: '왼발·오른발을 번갈아 톡톡 눌러 포도를 밟아 봐.', tryBtn: '톡톡 밟기',
      bag: { name: '포도즙 병', icon: '🍇' },
      fact: '포도는 돌 틀에서 발로 밟아 즙을 냈어.',
      sheep: '발굽이 보라색이 될 것 같아! 달콤한 포도 향이 퍼져.'
    },
    yoke: {
      title: '멍에', kind: 'look', theme: 'work', prop: 'yoke', cue: 'craft', icon: '🪵',
      fact: '두 마리 소가 함께 끌도록 어깨에 얹는 나무야. 예수님은 "내 멍에는 쉽고"라고 하셨어.',
      ref: '마 11:30', sheep: '둘이 나란히 걸으면 짐이 가벼워지나 봐.'
    },
    'stone-jar': {
      title: '돌 정결 항아리', kind: 'look', theme: 'work', prop: 'stonejar', cue: 'water', icon: '🪨',
      fact: '돌 항아리는 부정해지지 않는다고 여겨 정결 예식 물을 담았어.',
      ref: '요 2:6', sheep: '돌을 깎아 만든 항아리라 묵직해 보여.'
    },

    // 길과 여행
    'wild-flowers': {
      title: '들의 꽃', kind: 'look', theme: 'road', prop: 'flowers', cue: 'road', icon: '🌺',
      fact: '봄이면 언덕에 붉은 들꽃이 가득했어. "들의 백합화를 생각하여 보라."',
      ref: '마 6:28', sheep: '붉은 꽃잎이 바람에 흔들려. 코를 갖다 대 볼래.'
    },
    'terraced-field': {
      title: '계단식 밭과 돌담', kind: 'look', theme: 'road', prop: 'terrace', cue: 'road', icon: '⛰️',
      fact: '산지는 돌을 쌓아 계단 밭을 만들고 올리브·포도를 심었어.',
      sheep: '돌을 차곡차곡 쌓아 올려서 비탈도 밭이 됐네.'
    },
    'fig-tree': {
      title: '무화과나무', kind: 'look', theme: 'road', prop: 'fig', cue: 'road', icon: '🌳',
      fact: '그늘이 넓어 그 아래 앉아 쉬거나 성경을 묵상했대.',
      ref: '요 1:48', sheep: '잎이 넓어서 그늘이 진짜 시원해. 잠깐 쉬었다 가자.'
    },
    'traveler-pack': {
      title: '여행자의 짐', kind: 'look', theme: 'road', prop: 'pack', cue: 'road', icon: '🎒',
      fact: '지팡이, 가죽 물주머니, 샌들, 겉옷(밤엔 이불)이면 길을 떠났어.',
      sheep: '단출한데 필요한 건 다 있네. 밤엔 겉옷이 이불이 된대!'
    },
    milestone: {
      title: '돌 이정표', kind: 'look', theme: 'road', prop: 'milestone', cue: 'road', icon: '🗿',
      fact: '로마 사람들이 큰길에 거리를 새긴 돌기둥을 세웠어.',
      sheep: '돌에 글자가 새겨져 있어. 여기서 얼마나 더 가면 될까?'
    },
    donkey: {
      title: '나귀', kind: 'touch', theme: 'road', prop: 'donkey', anim: 'donkey', cue: 'animal', icon: '🫏',
      fact: '짐과 사람을 실어 나르던 든든한 동물이야. 산길에 강했어.',
      touchLine: '나귀가 긴 귀를 쫑긋하며 고개를 끄덕였어.', sheep: '움찔! 나귀 귀가 엄청 크네… 그래도 든든해 보여.'
    },
    'scroll-synagogue': {
      title: '회당과 두루마리', kind: 'look', theme: 'road', prop: 'scroll', cue: 'worship', icon: '📜',
      fact: '안식일이면 회당에 모여 두루마리 성경을 읽었어.',
      ref: '눅 4:16', sheep: '돌돌 말린 두루마리를 펼치면 말씀이 가득 적혀 있겠지.'
    },
    'small-village': {
      title: '작은 마을', kind: 'look', theme: 'road', prop: 'village', cue: 'road', icon: '🏘️',
      fact: '나사렛은 수백 명이 사는 작은 시골 마을이었어. "나사렛에서 무슨 선한 것이 나올 수 있느냐"는 말도 있었지.',
      ref: '요 1:46', sheep: '작고 조용한 마을이라 골목 끝까지 금방 친해지겠어.'
    },
    'city-gate': {
      title: '성문', kind: 'look', theme: 'road', prop: 'gate', cue: 'road', icon: '🚪',
      fact: '성문은 장로들이 앉아 재판하고 약속을 맺던 마을의 광장이었어.',
      ref: '룻 4:1', sheep: '사람들이 많이 오가는 자리네. 마을 소식이 다 모이겠다.'
    },
    census: {
      title: '호적 등록', kind: 'look', theme: 'road', prop: 'census', cue: 'road', icon: '📋',
      fact: '로마 황제의 명령으로 사람들은 조상의 고향에 가서 이름을 올렸어.',
      ref: '눅 2:1-3', sheep: '줄이 길게 늘어섰어. 멀리서 온 사람도 많나 봐.'
    },
    'roman-soldier': {
      title: '로마 군인', kind: 'look', theme: 'road', prop: 'soldier', cue: 'animal', icon: '🛡️',
      fact: '유대는 로마의 다스림을 받았어.',
      sheep: '갑옷 소리가 철컥거려. 괜히 발걸음이 조심스러워져.'
    },

    // 들과 목자
    sheepfold: {
      title: '돌 양 우리', kind: 'look', theme: 'field', prop: 'sheepfold', cue: 'wool', icon: '🐑',
      fact: '밤이면 양을 돌담 우리에 넣고 목자가 입구에 누워 문이 되었대.',
      ref: '요 10:7', sheep: '목자님이 입구를 지켜 주면 밤에도 하나도 안 무섭겠다.'
    },
    'shepherd-staff': {
      title: '목자의 지팡이와 막대기', kind: 'touch', theme: 'field', prop: 'staff', anim: 'scribe', cue: 'road', icon: '🦯',
      fact: '지팡이로 양을 이끌고 막대기로 들짐승을 쫓았어.',
      ref: '시 23:4', touchLine: '지팡이 끝으로 바닥을 톡 짚자 든든한 소리가 났어.', sheep: '저 지팡이가 있으면 길을 잃을 걱정이 없겠어.'
    },
    sling: {
      title: '물매 돌리기', kind: 'try', theme: 'field', prop: 'sling', cue: 'craft', icon: '🪨',
      tryMode: 'spin', tryPrompt: '원을 그려 물매를 힘차게 돌려 봐.', tryBtn: '물매 돌리기',
      bag: { name: '목자의 물매', icon: '🪨' },
      fact: '다윗도 쓰던 돌팔매야. 목자는 이걸로 양 떼를 지켰어.',
      ref: '삼상 17:40', sheep: '휘잉 소리가 나! 들짐승이 얼씬도 못 하겠다.'
    },
    'watch-fire': {
      title: '모닥불 지키기', kind: 'try', theme: 'field', prop: 'campfire', cue: 'fire', icon: '🔥',
      tryMode: 'tap', tryPrompt: '장작을 톡톡 넣어 모닥불을 따뜻하게 지켜 봐.', tryBtn: '장작 넣기',
      bag: { name: '따뜻한 불씨', icon: '🔥' },
      fact: '목자들은 밤새 불을 피우고 번갈아 깨어 있었어.',
      ref: '눅 2:8', sheep: '타닥타닥 불꽃이 따뜻해. 불 옆에서 꾸벅 졸릴 것 같아.'
    },
    'hold-lamb': {
      title: '새끼 양 안기', kind: 'touch', theme: 'field', prop: 'lamb', anim: 'sway', cue: 'baby', icon: '🐑',
      fact: '목자는 어린 양을 품에 안아 옮겼어.',
      ref: '사 40:11', touchLine: '새끼 양을 품에 안으니 보드라운 온기가 전해졌어.', sheep: '나도 가끔 그렇게 안아 줘!'
    },
    'feast-table': {
      title: '잔칫상', kind: 'touch', theme: 'field', prop: 'feast', anim: 'pray', cue: 'food', icon: '🍽️',
      fact: '아이가 태어나고 여드레째 이름을 짓고 이웃이 함께 기뻐했어.',
      ref: '눅 1:59', touchLine: '이웃들이 모여 아기 이름을 부르며 환하게 웃었어.', sheep: '맛있는 냄새랑 웃음소리가 마당 가득해!'
    },

    // 성탄의 밤
    'guest-room': {
      title: '손님방과 아래층 동물 칸', kind: 'look', theme: 'christmas', prop: 'guestroom', cue: 'animal', icon: '🏠',
      fact: '\'여관\'으로 옮긴 말은 집의 손님방을 뜻할 수도 있어. 집 아래층에는 동물이 지내는 칸이 있었대.',
      ref: '눅 2:7', sheep: '아래층에 동물들 자리가 있으면 밤에 꽤 따뜻하겠어.'
    },
    'knock-door': {
      title: '문 두드리기', kind: 'touch', theme: 'christmas', prop: 'door', anim: 'scribe', cue: 'road', icon: '✊',
      fact: '그날 밤 베들레헴은 사람으로 꽉 찼어.',
      touchLine: '똑똑 두드렸지만 안쪽은 이미 사람들로 가득해.', sheep: '빈자리가 있을까? 조금 더 걸어 보자.'
    },
    'city-of-david': {
      title: '다윗의 동네', kind: 'look', theme: 'christmas', prop: 'david', cue: 'worship', icon: '👑',
      fact: '베들레헴은 다윗 왕이 태어난 마을이야.',
      ref: '눅 2:4', sheep: '오래전 다윗이 양을 치던 언덕이 바로 이 근처래.'
    },
    'stone-manger': {
      title: '돌 구유', kind: 'look', theme: 'christmas', prop: 'manger', cue: 'baby', icon: '🪨',
      fact: '구유는 가축의 먹이를 담는 돌이나 나무 여물통이야.',
      ref: '눅 2:7', sheep: '여물통에 아기가 누웠다니… 발소리를 낮추게 돼.'
    },
    'cave-stable': {
      title: '동굴 마구간', kind: 'look', theme: 'christmas', prop: 'cave', cue: 'quiet', icon: '🪨',
      fact: '베들레헴에선 동굴을 가축 우리로 쓰기도 했대.',
      sheep: '바위 안쪽이라 찬 바람이 덜 들어오네.'
    },
    'ox-donkey': {
      title: '소와 나귀', kind: 'touch', theme: 'christmas', prop: 'oxdonkey', anim: 'donkey', cue: 'animal', icon: '🐂',
      fact: '따뜻한 숨을 쉬는 가축들이야.',
      touchLine: '소와 나귀가 하얀 입김을 내쉬며 조용히 고개를 끄덕였어.', sheep: '따뜻한 숨결 덕분에 마구간이 포근해.'
    },
    'great-star': {
      title: '큰 별', kind: 'look', theme: 'christmas', prop: 'greatstar', cue: 'worship', icon: '⭐',
      fact: '동방에서 온 사람들은 별을 따라왔어.',
      ref: '마 2:2', sheep: '저 별 진짜 밝다! 밤하늘에서 눈을 못 떼겠어.'
    }
  };

  // 첫 주 7곳 배치: 각 8~10개, 하루 새 발견 2~3개, 기존 인물 대사 재사용
  const spot = (id, x, z, extra = {}) => ({ id, pos: [x, z], ...extra });
  const week1Discover = {
    '1-0': {
      newIds: ['solomon-colonnade', 'money-changer', 'oil-lamp'],
      storyPeople: [
        { id: 'guard', actor: '성전 문지기', pos: [-3.15, 13.75], lines: cues['1-0'].lines },
        { id: 'merchant', actor: '등잔 상인', pos: [9.2, 14.3], lines: [[null, '깨어 있는 사람에겐 반값이지. 밤이 기니 등잔 기름부터 챙겨.']] }
      ],
      items: [
        spot('oil-lamp', 1.8, 13.4, { indoor: true }),
        spot('solomon-colonnade', -4.4, -6.2),
        spot('money-changer', 7.4, 14.5),
        spot('ascent-steps', 2.4, -10.5),
        spot('mikveh', 13.8, 1.4),
        spot('water-jar', 10.6, -2.5, { indoor: true }),
        spot('mud-brick', -12.6, 8.4),
        spot('traveler-pack', -17.2, -3.5, { ability: 'smell', hidden: true })
      ]
    },
    '1-1': {
      newIds: ['flat-roof', 'empty-cradle', 'millstone'],
      storyPeople: [
        { id: 'elizabeth', actor: '엘리사벳', pos: [-4.1, 8.4], lines: cues['1-1'].lines }
      ],
      items: [
        spot('millstone', -1.8, 10.4, { indoor: true }),
        spot('empty-cradle', -3.6, 13.1, { indoor: true }),
        spot('flat-roof', -1.80, -20.34),
        spot('clay-oven', 2.3, 8.3, { indoor: true }),
        spot('well-bucket', 5.9, 9.1),
        spot('oil-lamp', 2.9, -15.4, { indoor: true }),
        spot('water-jar', -5.4, 15.2, { indoor: true }),
        spot('mud-brick', 11.4, 6.2),
        spot('carpenter-plane', 8.8, -19.5, { indoor: true, ability: 'jump' })
      ]
    },
    '1-2': {
      newIds: ['priest-linen', 'temple-trumpet', 'dove-seller'],
      storyPeople: [
        { id: 'zach', actor: '사가랴', pos: [-3.65, -10.3], lines: people.zachariah[1] }
      ],
      items: [
        spot('dove-seller', -7.4, 14.6),
        spot('priest-linen', -3.5, -5.2),
        spot('temple-trumpet', 4.4, -14.8),
        spot('solomon-colonnade', 4.3, -3.6),
        spot('money-changer', 7.4, 14.3),
        spot('ascent-steps', -2.4, -10.4),
        spot('mikveh', 13.8, 1.4),
        spot('water-jar', 10.6, -2.5, { indoor: true }),
        spot('oil-lamp', -10.8, 15.8, { indoor: true })
      ]
    },
    '1-3': {
      newIds: ['incense-altar', 'menorah', 'waiting-court'],
      storyPeople: [
        { id: 'story-zach', actor: '사가랴', pos: [2.6, -15.2], lines: people.incenseZachariah[1] },
        { id: 'waiting', actor: '기다리는 사람', pos: [3.9, -4], lines: [[null, '평소보다 오래 걸리네. 향이 피어오르는 동안 밖에서 함께 기도하자.']] }
      ],
      items: [
        spot('incense-altar', 0, -16.5),
        spot('menorah', -3.1, -17.2),
        spot('waiting-court', -3.4, 9.2),
        spot('priest-linen', 4.2, -9.2),
        spot('temple-trumpet', -4.6, -14.8),
        spot('solomon-colonnade', -4.3, -2.8),
        spot('mikveh', 13.8, 1.4),
        spot('oil-lamp', 11.8, 13.5, { indoor: true, ability: 'smell', hidden: true })
      ]
    },
    '1-4': {
      newIds: ['wax-tablet', 'water-carry', 'scroll-synagogue'],
      storyPeople: [
        { id: 'gather', actor: '기다리던 사람', pos: [1.2, 1.5], lines: people.templeWitness[1] },
        { id: 'zach', actor: '사가랴', pos: [-1.7, -16.9], lines: zachariahLater }
      ],
      items: [
        spot('wax-tablet', 7.6, 13.4, { indoor: true }),
        spot('water-carry', 10.5, -2.2),
        spot('scroll-synagogue', -4.2, -14.6, { indoor: true }),
        spot('solomon-colonnade', -4.3, -2.8),
        spot('dove-seller', -7.4, 14.6),
        spot('money-changer', 11.4, 6.2),
        spot('ascent-steps', 2.5, -10.6),
        spot('waiting-court', 3.4, 7.6),
        spot('priest-linen', 4.2, -8.8),
        spot('mikveh', 13.8, 1.4)
      ]
    },
    '1-5': {
      newIds: ['wild-flowers', 'terraced-field', 'winepress'],
      storyPeople: [
        { id: 'start', actor: '사가랴', pos: [2.6, 12.8], lines: cues['1-5'].lines },
        { id: 'elizabeth', actor: '엘리사벳', pos: [1.25, -18.25], lines: [[null, '무사히 돌아오셨군요. 산골길 바람이 꽤 찼을 텐데.']] }
      ],
      items: [
        spot('wild-flowers', 3.4, 13.5),
        spot('terraced-field', 11.8, -2.4),
        spot('winepress', -10.4, -4.6),
        spot('fig-tree', 3.4, -14.8),
        spot('milestone', -2.8, 11.4),
        spot('donkey', -6.9, 5.3, { residentKey: 'mule' }),
        spot('well-bucket', 5.9, 9.1),
        spot('traveler-pack', -4.2, -14.2),
        spot('olive-press', -7.9, 6.5, { ability: 'push' })
      ]
    },
    '1-6': {
      newIds: ['swaddle-wrap', 'loom-spindle', 'courtyard-hill'],
      storyPeople: [
        { id: 'elizabeth', actor: '엘리사벳', pos: [-3.6, -11.9], lines: cues['1-6'].lines }
      ],
      items: [
        spot('swaddle-wrap', 1.4, -15.6, { indoor: true }),
        spot('loom-spindle', -8.6, 10.6, { indoor: true }),
        spot('courtyard-hill', 3.6, 13.8),
        spot('flat-roof', -1.80, -20.34),
        spot('millstone', -1.8, 10.4, { indoor: true }),
        spot('clay-oven', 2.4, 8.2, { indoor: true }),
        spot('oil-lamp', 3.2, -14.2, { indoor: true }),
        spot('water-jar', -5.4, 15.2, { indoor: true }),
        spot('empty-cradle', -3.6, -13.6, { indoor: true })
      ]
    },
    '2-0': {
      newIds: ['milestone', 'traveler-pack', 'donkey'],
      storyPeople: [
        { id: 'joseph', actor: '요셉', pos: [-2.6, 14.6], lines: cues['2-0'].lines },
        { id: 'guide', actor: '고갯길 목자', pos: [9.9, -13.5], lines: [[null, '물이 빠지고 돌이 남았어. 길을 곧게 닦아 두면 나그네들이 편히 지나갈 거야.']] }
      ],
      items: [
        spot('milestone', -3.2, 10.5),
        spot('traveler-pack', 4.6, 12.2),
        spot('donkey', 2.8, 14.0),
        spot('wild-flowers', -5.4, 2.5),
        spot('terraced-field', 11.4, -3.5),
        spot('fig-tree', -11.5, -6.2),
        spot('shepherd-staff', 8.2, -13.2),
        spot('olive-press', 14.2, 4.8, { ability: 'push' })
      ]
    },
    '2-1': {
      newIds: ['small-village', 'fig-tree', 'mud-brick'],
      storyPeople: [
        { id: 'joseph', actor: '요셉', pos: [-3.4, 11.2], lines: cues['2-1'].lines },
        { id: 'waterNeighbor', actor: '우물가 이웃', pos: [-4.7, -15.7], lines: [[null, '오늘은 목공소가 조용하네. 요셉이 먼저 말해 줄 때까지 기다려 주자.']] }
      ],
      items: [
        spot('small-village', -3.8, 13.5),
        spot('fig-tree', -14.2, -15.4),
        spot('mud-brick', 6.8, 3.2),
        spot('well-bucket', 5.9, 9.1),
        spot('water-carry', 3.8, 9.2),
        spot('carpenter-plane', 1.9, -3.2, { indoor: true, house: '나사렛 집' }),
        spot('oil-lamp', 1.2, -3.2, { indoor: true, house: '나사렛 집' }),
        spot('millstone', 2.6, -3.2, { indoor: true, house: '나사렛 집' }),
        spot('clay-oven', 1.5, -2.9, { indoor: true, house: '나사렛 집' })
      ]
    },
    '2-2': {
      newIds: ['carpenter-plane', 'yoke', 'scroll-synagogue'],
      storyPeople: [
        { id: 'joseph', actor: '요셉', pos: [-2.8, -16.6], lines: cues['2-2'].lines },
        { id: 'apprentice', actor: '견습 목수', pos: [13.1, -15.7], lines: [[null, '요셉 형님이 다듬은 멍에는 모서리가 매끈해서 소 어깨가 상하지 않아.']] }
      ],
      items: [
        spot('carpenter-plane', 0.4, -19.2, { indoor: true, house: '요셉의 작업장' }),
        spot('yoke', -3.8, -15.2),
        spot('scroll-synagogue', 1.1, -19.2, { indoor: true, house: '요셉의 작업장' }),
        spot('oil-lamp', -0.3, -19.2, { indoor: true, house: '요셉의 작업장' }),
        spot('water-jar', 0.8, -18.9, { indoor: true, house: '요셉의 작업장' }),
        spot('mud-brick', -8.4, 4.5),
        spot('small-village', 3.5, 13.8),
        spot('traveler-pack', 10.6, -2.2),
        spot('wax-tablet', 0.0, -18.9, { indoor: true, house: '요셉의 작업장', ability: 'smell', hidden: true })
      ]
    },
    '2-3': {
      newIds: ['clay-oven', 'water-jar', 'oil-lamp'],
      storyPeople: [
        { id: 'story-joseph', actor: '요셉', pos: [-1.3, 12.1], lines: cues['2-3'].lines },
        { id: 'watch', actor: '골목을 지키는 이웃', pos: [12.6, 11.7], lines: [[null, '등잔이 꺼진 밤에는 별빛이 처마 끝까지 내려앉는단다.']] }
      ],
      items: [
        spot('clay-oven', 0.4, -19.2, { indoor: true, house: '요셉의 작업장' }),
        spot('water-jar', 1.0, -19.2, { indoor: true, house: '요셉의 작업장' }),
        spot('oil-lamp', -0.4, -19.2, { indoor: true, house: '요셉의 작업장' }),
        spot('carpenter-plane', 0.2, -18.9, { indoor: true, house: '요셉의 작업장' }),
        spot('millstone', -0.8, -18.9, { indoor: true, house: '요셉의 작업장' }),
        spot('yoke', 10.6, -2.5),
        spot('flat-roof', 3.4, -16.8),
        spot('donkey', 13.8, 1.2)
      ]
    },
    '2-4': {
      newIds: ['olive-press', 'ascent-steps', 'scroll-synagogue'],
      storyPeople: [
        { id: 'joseph', actor: '요셉', pos: [-2.9, 13.6], lines: cues['2-4'].lines },
        { id: 'farmer', actor: '올리브 밭 주인', pos: [-8.8, 3.0], lines: [[null, '가을에 딴 올리브를 돌 틀에 으깨고 눌러야 맑은 기름이 나온단다.']] }
      ],
      items: [
        spot('olive-press', -7.2, 2.2),
        spot('ascent-steps', -3.2, 10.4),
        spot('scroll-synagogue', -10.0, 13.5, { indoor: true, house: '갈릴리 회당' }),
        spot('wild-flowers', -4.2, -1.5),
        spot('terraced-field', 5.2, -7.4),
        spot('fig-tree', 11.2, -4.2),
        spot('milestone', 2.4, 13.8),
        spot('traveler-pack', -8.7, -19.2, { ability: 'jump' })
      ]
    },
    '2-5': {
      newIds: ['stone-jar', 'mikveh', 'oil-lamp'],
      storyPeople: [
        { id: 'joseph', actor: '요셉', pos: [-3.4, 13.8], lines: cues['2-5'].lines },
        { id: 'maria', actor: '마리아', pos: [-12.6, -4.2], lines: [[null, '요셉이 곧게 단 문을 같이 닫고 처음으로 한 등잔에 불을 켰어요.']] }
      ],
      items: [
        spot('stone-jar', 0.5, -18.2, { indoor: true, house: '요셉과 마리아의 새집' }),
        spot('mikveh', -10.4, 3.5),
        spot('oil-lamp', -0.5, -18.2, { indoor: true, house: '요셉과 마리아의 새집' }),
        spot('clay-oven', 0.2, -17.9, { indoor: true, house: '요셉과 마리아의 새집' }),
        spot('loom-spindle', -0.4, -17.9, { indoor: true, house: '요셉과 마리아의 새집' }),
        spot('small-village', 3.8, 13.2),
        spot('wild-flowers', 11.2, -15.4),
        spot('well-bucket', 5.9, 9.1),
        spot('fig-tree', -14.2, -15.6)
      ]
    },
    '2-6': {
      newIds: ['well-bucket', 'water-carry', 'water-jar'],
      storyPeople: [
        { id: 'joe', actor: '요셉', pos: [5.2, 12.8], lines: cues['2-6'].lines },
        { id: 'maria', actor: '마리아', pos: [2.9, -17.3], lines: [[null, '우물에서 길어 온 물로 항아리를 채웠어요. 이제 정말 사람 사는 집 같아요.']] }
      ],
      items: [
        spot('well-bucket', 2.7, 0.7),
        spot('water-carry', -2.4, 13.2),
        spot('water-jar', 4.7, -17.5, { indoor: true, house: '요셉과 마리아의 집' }),
        spot('stone-jar', 5.2, -17.5, { indoor: true, house: '요셉과 마리아의 집' }),
        spot('oil-lamp', 4.2, -17.5, { indoor: true, house: '요셉과 마리아의 집' }),
        spot('millstone', 4.5, -17.2, { indoor: true, house: '요셉과 마리아의 집' }),
        spot('loom-spindle', 5.0, -17.2, { indoor: true, house: '요셉과 마리아의 집' }),
        spot('mud-brick', -11.2, 4.8),
        spot('olive-press', 11.6, -3.2, { ability: 'smell', hidden: true })
      ]
    },
    '3-0': {
      newIds: ['fig-tree', 'loom-spindle', 'small-village'],
      storyPeople: [
        { id: 'maria', actor: '마리아', pos: [-2.7, -4.7], lines: cues['3-0'].lines }
      ],
      items: [
        spot('fig-tree', -4.6, 1.2),
        spot('loom-spindle', -5.4, -5.5, { indoor: true, house: '마리아의 집' }),
        spot('small-village', -2.8, 3.6),
        spot('oil-lamp', -5.0, -5.5, { indoor: true, house: '마리아의 집' }),
        spot('water-jar', -5.8, -5.5, { indoor: true, house: '마리아의 집' }),
        spot('millstone', -5.2, -5.2, { indoor: true, house: '마리아의 집' }),
        spot('well-bucket', 4.2, -0.8),
        spot('mud-brick', 3.4, -4.6)
      ]
    },
    '3-1': {
      newIds: ['well-bucket', 'stone-jar'],
      storyPeople: [
        { id: 'maria', actor: '마리아', pos: [-3.5, -4.6], lines: cues['3-1'].lines }
      ],
      items: [
        spot('well-bucket', -0.4, -3.5),
        spot('stone-jar', -5.4, -5.5, { indoor: true, house: '우물가 집' }),
        spot('water-carry', 1.6, -2.1),
        spot('water-jar', -5.0, -5.5, { indoor: true, house: '우물가 집' }),
        spot('oil-lamp', -5.8, -5.5, { indoor: true, house: '우물가 집' }),
        spot('clay-oven', -5.2, -5.2, { indoor: true, house: '우물가 집' }),
        spot('small-village', -3.2, 2.8),
        spot('wild-flowers', 3.6, 1.4, { ability: 'smell', hidden: true })
      ]
    },
    '3-2': {
      newIds: ['traveler-pack', 'milestone', 'donkey'],
      storyPeople: [
        { id: 'maria', actor: '마리아', pos: [-0.3, 4.3], lines: cues['3-2'].lines }
      ],
      items: [
        spot('traveler-pack', -2.6, 3.8),
        spot('milestone', 2.8, 2.5),
        spot('donkey', -3.8, -1.2),
        spot('terraced-field', 4.2, -1.8),
        spot('wild-flowers', -4.4, 1.6),
        spot('fig-tree', 3.6, -4.5),
        spot('water-jar', 0.4, -6.5, { indoor: true, house: '산골집' }),
        spot('oil-lamp', -0.4, -6.5, { indoor: true, house: '산골집' })
      ]
    },
    '3-3': {
      newIds: ['courtyard-hill', 'swaddle-wrap', 'loom-spindle'],
      storyPeople: [
        { id: 'elizabeth', actor: '엘리사벳', pos: [2.0, -5.37], lines: cues['3-3'].lines }
      ],
      items: [
        spot('courtyard-hill', -3.2, 2.8),
        spot('swaddle-wrap', 0.4, -5.9, { indoor: true, house: '엘리사벳의 집' }),
        spot('loom-spindle', -0.4, -5.9, { indoor: true, house: '엘리사벳의 집' }),
        spot('empty-cradle', 0.2, -5.7, { indoor: true, house: '엘리사벳의 집' }),
        spot('oil-lamp', -0.2, -5.7, { indoor: true, house: '엘리사벳의 집' }),
        spot('water-jar', 0.6, -5.7, { indoor: true, house: '엘리사벳의 집' }),
        spot('millstone', -0.6, -5.7, { indoor: true, house: '엘리사벳의 집' }),
        spot('mud-brick', 4.2, -2.6),
        spot('fig-tree', -4.2, -3.2)
      ]
    },
    '3-4': {
      newIds: ['wild-flowers', 'terraced-field'],
      storyPeople: [
        { id: 'maria', actor: '마리아', pos: [0, 3.8], lines: cues['3-4'].lines }
      ],
      items: [
        spot('wild-flowers', 2.4, 2.4),
        spot('terraced-field', 3.8, -1.6),
        spot('scroll-synagogue', -4.0, 2.5, { indoor: true, house: '언덕 쉼터' }),
        spot('temple-trumpet', 3.2, -2.5),
        spot('fig-tree', -4.5, -3.2),
        spot('olive-press', 4.4, 1.4),
        spot('ascent-steps', 0.2, -4.4),
        spot('traveler-pack', -3.6, 4.4, { ability: 'smell', hidden: true })
      ]
    },
    '3-5': {
      newIds: ['winepress', 'olive-press'],
      storyPeople: [
        { id: 'maria', actor: '마리아', pos: [0, 2.9], lines: cues['3-5'].lines }
      ],
      items: [
        spot('winepress', 4.4, 2.2),
        spot('olive-press', -4.4, 2.0),
        spot('terraced-field', -4.6, -2.4),
        spot('wild-flowers', 4.2, -2.2),
        spot('fig-tree', -3.4, 4.2),
        spot('water-carry', 2.8, -3.6),
        spot('clay-oven', 0.4, -5.9, { indoor: true, house: '엘리사벳의 집' }),
        spot('millstone', -0.4, -5.9, { indoor: true, house: '엘리사벳의 집' })
      ]
    },
    '3-6': {
      newIds: ['feast-table', 'wax-tablet'],
      storyPeople: [
        { id: 'elizabeth', actor: '엘리사벳', pos: [-1.1, 1.5], lines: cues['3-6'].lines },
        { id: 'zach', actor: '사가랴', pos: [1.7, -4.6], lines: zachariahLater }
      ],
      items: [
        spot('feast-table', -3.2, -4.4),
        spot('wax-tablet', 0.4, -5.9, { indoor: true, house: '엘리사벳의 집' }),
        spot('swaddle-wrap', -0.4, -5.9, { indoor: true, house: '엘리사벳의 집' }),
        spot('empty-cradle', 0.2, -5.7, { indoor: true, house: '엘리사벳의 집' }),
        spot('clay-oven', -0.2, -5.7, { indoor: true, house: '엘리사벳의 집' }),
        spot('water-jar', 0.6, -5.7, { indoor: true, house: '엘리사벳의 집' }),
        spot('oil-lamp', -0.6, -5.7, { indoor: true, house: '엘리사벳의 집' }),
        spot('courtyard-hill', 3.4, -4.2),
        spot('winepress', 4.4, 1.8)
      ]
    },
    '4-0': {
      newIds: ['city-gate', 'census', 'roman-soldier'],
      storyPeople: [
        { id: 'grandpa', actor: '할아버지', pos: [-3.8, 4.6], lines: cues['4-0'].lines }
      ],
      items: [
        spot('city-gate', 0, -5.2),
        spot('census', 2.8, -4.8),
        spot('roman-soldier', -4.4, -4.8),
        spot('city-of-david', 3.0, 2.4),
        spot('milestone', -5.2, 2.6),
        spot('traveler-pack', -5.2, -1.2),
        spot('donkey', 5.6, -1.4),
        spot('water-carry', -0.4, 4.4, { ability: 'smell', hidden: true })
      ]
    },
    '4-1': {
      newIds: ['guest-room', 'knock-door', 'city-of-david'],
      storyPeople: [
        { id: 'innkeeper', actor: '여관 주인', pos: [-0.1, 3.5], lines: cues['4-1'].lines }
      ],
      items: [
        spot('guest-room', -5.4, -5.5, { indoor: true, house: '여관' }),
        spot('knock-door', -3.2, -5.2),
        spot('city-of-david', 2.8, 2.6),
        spot('oil-lamp', -5.0, -5.5, { indoor: true, house: '여관' }),
        spot('water-jar', -5.8, -5.5, { indoor: true, house: '여관' }),
        spot('clay-oven', -5.2, -5.2, { indoor: true, house: '여관' }),
        spot('traveler-pack', -3.2, 2.4),
        spot('donkey', 3.4, -3.8),
        spot('well-bucket', 4.2, -0.8)
      ]
    },
    '4-2': {
      newIds: ['sheepfold', 'shepherd-staff', 'hold-lamb'],
      storyPeople: [
        { id: 'grandpa', actor: '할아버지', pos: [0.7, -2.8], lines: cues['4-2'].lines }
      ],
      items: [
        spot('sheepfold', 4.4, -4.4),
        spot('shepherd-staff', -2.6, -2.4),
        spot('hold-lamb', -4.4, 1.4),
        spot('sling', 3.4, 1.2),
        spot('watch-fire', -1.4, -4.6),
        spot('wild-flowers', -3.6, 4.2),
        spot('terraced-field', 4.6, 2.2),
        spot('traveler-pack', -4.6, -4.4, { ability: 'smell', hidden: true })
      ]
    },
    '4-3': {
      newIds: ['watch-fire', 'sling'],
      storyPeople: [
        { id: 'grandpa', actor: '할아버지', pos: [-0.1, -3.65], lines: cues['4-3'].lines }
      ],
      items: [
        spot('watch-fire', -1.4, -4.6),
        spot('sling', 2.8, -1.6),
        spot('sheepfold', 4.4, -4.4),
        spot('shepherd-staff', -3.2, -2.4),
        spot('hold-lamb', 3.8, 1.8),
        spot('oil-lamp', -4.0, 2.5, { indoor: true, house: '목자의 천막' }),
        spot('traveler-pack', 2.6, 2.4),
        spot('donkey', 4.6, -1.2, { ability: 'smell', hidden: true })
      ]
    },
    '4-4': {
      newIds: ['cave-stable', 'ox-donkey', 'great-star'],
      storyPeople: [
        { id: 'grandpa', actor: '할아버지', pos: [-1.4, 4.3], lines: cues['4-4'].lines }
      ],
      items: [
        spot('cave-stable', -3.2, -3.8),
        spot('ox-donkey', 0.4, -5.1, { indoor: true, house: '마구간' }),
        spot('great-star', 3.6, -4.6),
        spot('stone-manger', -0.4, -5.1, { indoor: true, house: '마구간' }),
        spot('swaddle-wrap', 0.2, -4.9, { indoor: true, house: '마구간' }),
        spot('oil-lamp', -0.2, -4.9, { indoor: true, house: '마구간' }),
        spot('shepherd-staff', -2.8, 1.6),
        spot('hold-lamb', 2.8, 1.2),
        spot('guest-room', -4.4, 2.8)
      ]
    },
    end: {
      newIds: ['stone-manger', 'swaddle-wrap', 'great-star'],
      storyPeople: [
        { id: 'joseph', actor: '요셉', pos: [0, -4.38], lines: cues.end.lines }
      ],
      items: [
        spot('stone-manger', 0.0, -5.1, { indoor: true, house: '마구간' }),
        spot('swaddle-wrap', 0.4, -5.1, { indoor: true, house: '마구간' }),
        spot('great-star', 3.4, -4.4),
        spot('cave-stable', -3.4, -3.8),
        spot('ox-donkey', -0.4, -5.1, { indoor: true, house: '마구간' }),
        spot('oil-lamp', 0.2, -4.9, { indoor: true, house: '마구간' }),
        spot('hold-lamb', -2.6, 1.4),
        spot('shepherd-staff', 2.8, 1.6),
        spot('city-of-david', -4.2, 3.2)
      ]
    }
  };

  for (const [id, spec] of Object.entries(week1Discover)) {
    if (window.EXPLORE[id]) window.EXPLORE[id].discover = spec;
  }
  window.DISCOVER_THEMES = DISCOVER_THEMES;
  window.DISCOVERIES = DISCOVERIES;
})();
