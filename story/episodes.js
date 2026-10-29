/*
  에피소드 목록 (날짜·제목·진행 인물)
  - date: 공개일(한국 시간). openHour가 있으면 그 시각부터 열림(주일은 예배 후 13시).
  - host: 그 편 시작에서 "어제 미션 했어?"를 묻는 인물.
  - 대본은 story/intro.js, story/ch1.js … 에 있습니다.
*/
window.CHAPTERS = [
  { n: 0, label: '시작', title: '시작하기' },
  { n: 1, label: '1장 소망', title: '400년의 침묵', who: '사가랴', tone: 'ch1' },
  { n: 2, label: '2장 평화', title: '의로운 사람', who: '요셉', tone: 'ch2' },
  { n: 3, label: '3장 기쁨', title: '뛰노는 아이', who: '마리아', tone: 'ch3' },
  { n: 4, label: '4장 사랑', title: '방이 없습니다', who: '어린 목동', tone: 'ch4' },
  { n: 5, label: '성탄', title: '그 밤', who: '', tone: 'end' }
];

window.EPISODES = [
  { id: '0',   ch: 0, day: '시작',     date: null,         title: '시작하기', host: '' },

  { id: '1-0', ch: 1, day: '프롤로그', date: '2026-11-29', openHour: 13, title: '문지기', host: '사가랴' },
  { id: '1-1', ch: 1, day: '1일차',    date: '2026-11-30', title: '흠 없는 사람, 빈 요람', host: '사가랴' },
  { id: '1-2', ch: 1, day: '2일차',    date: '2026-12-01', title: '제비', host: '사가랴' },
  { id: '1-3', ch: 1, day: '3일차',    date: '2026-12-02', title: '네 간구함이 들린지라', host: '사가랴' },
  { id: '1-4', ch: 1, day: '4일차',    date: '2026-12-03', title: '말을 잃다', host: '사가랴' },
  { id: '1-5', ch: 1, day: '5일차',    date: '2026-12-04', title: '서판', host: '사가랴' },
  { id: '1-6', ch: 1, day: '6일차',    date: '2026-12-05', title: '다섯 달', host: '사가랴' },

  { id: '2-0', ch: 2, day: '프롤로그', date: '2026-12-06', openHour: 13, title: '길을 예비하라', host: '요셉' },
  { id: '2-1', ch: 2, day: '1일차',    date: '2026-12-07', title: '드러난 일', host: '요셉' },
  { id: '2-2', ch: 2, day: '2일차',    date: '2026-12-08', title: '의로운 사람', host: '요셉' },
  { id: '2-3', ch: 2, day: '3일차',    date: '2026-12-09', title: '꿈', host: '요셉' },
  { id: '2-4', ch: 2, day: '4일차',    date: '2026-12-10', title: '임마누엘', host: '요셉' },
  { id: '2-5', ch: 2, day: '5일차',    date: '2026-12-11', title: '데려오다', host: '요셉' },
  { id: '2-6', ch: 2, day: '6일차',    date: '2026-12-12', title: '이름을 기다리는 사람', host: '요셉' },

  { id: '3-0', ch: 3, day: '프롤로그', date: '2026-12-13', openHour: 13, title: '되감기: 은혜를 받은 자여', host: '마리아' },
  { id: '3-1', ch: 3, day: '1일차',    date: '2026-12-14', title: '말씀대로', host: '마리아' },
  { id: '3-2', ch: 3, day: '2일차',    date: '2026-12-15', title: '산골로 빨리', host: '마리아' },
  { id: '3-3', ch: 3, day: '3일차',    date: '2026-12-16', title: '뛰노는 아이', host: '마리아' },
  { id: '3-4', ch: 3, day: '4일차',    date: '2026-12-17', title: '마리아의 노래', host: '마리아' },
  { id: '3-5', ch: 3, day: '5일차',    date: '2026-12-18', title: '석 달', host: '마리아' },
  { id: '3-6', ch: 3, day: '6일차',    date: '2026-12-19', title: '그 이름은 요한', host: '사가랴' },

  { id: '4-0', ch: 4, day: '프롤로그', date: '2026-12-20', openHour: 13, title: '다윗의 동네', host: '할아버지' },
  { id: '4-1', ch: 4, day: '1일차',    date: '2026-12-21', title: '방이 없습니다', host: '할아버지' },
  { id: '4-2', ch: 4, day: '2일차',    date: '2026-12-22', title: '목동의 자리', host: '할아버지' },
  { id: '4-3', ch: 4, day: '3일차',    date: '2026-12-23', title: '밤을 지키는 사람들', host: '할아버지' },
  { id: '4-4', ch: 4, day: '성탄 전야', date: '2026-12-24', title: '그 밤', host: '할아버지' },

  { id: 'end', ch: 5, day: '성탄',     date: '2026-12-25', title: '그 밤을 향하여', host: '할아버지' }
];

// 대본 저장소: 각 장 파일이 STORY['1-0'] = `...` 식으로 채웁니다.
window.STORY = window.STORY || {};
