/**
 * 匿名歸因 ID：首次啟動產生、永久沿用，儲存介面注入式
 */
const KEY = "user_ref_id";
const ALPHANUM = "abcdefghijklmnopqrstuvwxyz0123456789";

function randomRefId(rng = Math.random) {
  let s = "";
  for (let i = 0; i < 8; i++) s += ALPHANUM[Math.floor(rng() * ALPHANUM.length)];
  return `u_${s}`;
}

export function createRefIdStore(storage, rng = Math.random) {
  return {
    getOrCreate() {
      let id = storage.getItem(KEY);
      if (!id) {
        id = randomRefId(rng);
        storage.setItem(KEY, id);
      }
      return id;
    },
  };
}
