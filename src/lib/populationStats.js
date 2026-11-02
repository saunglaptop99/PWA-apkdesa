const normalizedAddress = (value) => String(value || '').trim().toLocaleLowerCase('id-ID').replace(/\s+/g, ' ');

export function summarizeResidents(rows = []) {
  const homes = new Set();
  const familyCards = new Set();
  let headsOfFamily = 0;
  let residentsWithoutAddress = 0;
  let lakiLaki = 0;
  let perempuan = 0;

  for (const row of rows) {
    const address = normalizedAddress(row.alamat_detail);
    if (address) homes.add(address);
    else residentsWithoutAddress += 1;

    if (row.no_kk) familyCards.add(String(row.no_kk).trim());
    if (row.shdk === 'Kepala Keluarga') headsOfFamily += 1;
    if (row.jenis_kelamin === 'Laki-laki') lakiLaki += 1;
    if (row.jenis_kelamin === 'Perempuan') perempuan += 1;
  }

  return {
    residents: rows.length,
    homes: homes.size,
    headsOfFamily,
    familyCards: familyCards.size,
    residentsWithoutAddress,
    lakiLaki,
    perempuan,
  };
}

export function groupResidentsByArea(rows = []) {
  const groups = new Map();

  for (const row of rows) {
    const dusun = String(row.dusun || 'Belum ditentukan').trim();
    const rw = String(row.rw || '??').padStart(2, '0');
    const rt = String(row.rt || '??').padStart(2, '0');
    const key = `${dusun.toLocaleLowerCase('id-ID')}|${rw}|${rt}`;
    if (!groups.has(key)) groups.set(key, { dusun, rw, rt, residents: [] });
    groups.get(key).residents.push(row);
  }

  return [...groups.values()]
    .map((group) => ({ ...group, ...summarizeResidents(group.residents) }))
    .sort((a, b) => a.dusun.localeCompare(b.dusun, 'id') || a.rw.localeCompare(b.rw, 'id') || a.rt.localeCompare(b.rt, 'id'));
}
