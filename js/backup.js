/* 기록 백업·복원: 기록 전체를 '백업 코드'(글자)로 만들어 카톡 나와의 채팅 등에 보관했다가 다시 불러온다 */
(function () {
  const HEAD = '그밤백업1';
  const toB64 = bytes => { let s = ''; for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192)); return btoa(s); };
  const fromB64 = b64 => Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  async function pipe(bytes, Stream) {
    const s = new Blob([bytes]).stream().pipeThrough(new Stream('gzip'));
    return new Uint8Array(await new Response(s).arrayBuffer());
  }
  async function make() {
    const json = JSON.stringify(Core.data);
    let bytes = new TextEncoder().encode(json), tag = ':';
    if (window.CompressionStream) { try { bytes = await pipe(bytes, CompressionStream); tag = 'z:'; } catch (e) { bytes = new TextEncoder().encode(json); } }
    Core.data.lastBackup = Date.now(); Core.save();
    return HEAD + tag + toB64(bytes);
  }
  async function read(code) {
    code = String(code || '').replace(/\s+/g, '');
    const m = code.match(/그밤백업1(z?):([A-Za-z0-9+/=]+)/);
    if (!m) throw new Error('백업 코드가 아니에요');
    if (m[1] === 'z' && !window.DecompressionStream) throw new Error('이 브라우저에서는 이 코드를 풀 수 없어요. 사파리나 크롬에서 열어 주세요');
    let obj;
    try {
      let bytes = fromB64(m[2]);
      if (m[1] === 'z') bytes = await pipe(bytes, DecompressionStream);
      obj = JSON.parse(new TextDecoder().decode(bytes));
    } catch (e) { throw new Error('코드가 잘렸거나 틀렸어요. 처음부터 끝까지 다 복사했는지 확인해 줘'); }
    if (!obj || typeof obj !== 'object' || !('done' in obj)) throw new Error('기록 내용이 이상해요');
    return obj;
  }
  // 요약: "별빛 n · 일기 n · 묵상 n"
  function summary(obj) {
    const n = o => Object.keys(o || {}).length;
    return `${obj.nickname || '이름 없음'} · 별빛 ${Object.keys(obj.done || {}).filter(k => k !== '0').length} · 일기 ${n(obj.diary)} · 묵상 ${n(obj.medi)}`;
  }
  window.Backup = { make, read, summary };
})();
