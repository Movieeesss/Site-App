import React, { useState, useEffect } from 'react';

const CLIENT_ID = "683400126186-f3a9u3fbe6l50bv1vidci7oinq7socn6.apps.googleusercontent.com";
const SCOPES = "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets";

export default function FloraVillaRegister() {
  const [project, setProject] = useState("FLORA VILLA-75E");
  const [accessToken, setAccessToken] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [rows, setRows] = useState(() => {
    const saved = localStorage.getItem('site_v30_sheets');
    return saved ? JSON.parse(saved) : [{ 
      id: Date.now(), date: '2026-04-14', desc: '', loggedBy: '', 
      status: 'Open', before: [], after: [], owner: '', remarks: '' 
    }];
  });

  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
    localStorage.setItem('site_v30_sheets', JSON.stringify(rows));
    return () => { if(document.body.contains(script)) document.body.removeChild(script); };
  }, [rows]);

  const handleLogin = () => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (res) => { if (res.access_token) setAccessToken(res.access_token); },
    });
    client.requestAccessToken();
  };

  const uploadPhoto = async (rowId, type, files) => {
    if (!accessToken) return alert("Connect Drive First!");
    for (const file of Array.from(files)) {
      const metadata = { name: `Photo_${Date.now()}.jpg`, mimeType: 'image/jpeg' };
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', file);
      try {
        const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,thumbnailLink', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}` },
          body: form
        });
        const data = await res.json();
        // Drive ID and Thumbnail for Sheets
        const driveUrl = `https://lh3.googleusercontent.com/d/${data.id}`;
        setRows(prev => prev.map(r => r.id === rowId ? { ...r, [type]: [...r[type], driveUrl] } : r));
      } catch (e) { console.error(e); }
    }
  };

  const syncToSheets = async () => {
    if (!accessToken) return alert("Login First!");
    setIsSyncing(true);
    try {
      const sheetRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ properties: { title: `${project}_${new Date().toLocaleDateString()}` } })
      });
      const sheetData = await sheetRes.json();
      const spreadsheetId = sheetData.spreadsheetId;

      const values = [
        ["S.No", "Date Logged", "Description", "Logged by", "Status", "Closed Date", "P1(B)", "P2(B)", "P3(B)", "P4(B)", "P5(B)", "P1(A)", "P2(A)", "P3(A)", "P4(A)", "P5(A)", "Owner", "Remarks"],
        ...rows.map((r, i) => [
          i + 1, r.date, r.desc, r.loggedBy, r.status, "",
          ...Array(5).fill("").map((_, idx) => r.before[idx] ? `=IMAGE("${r.before[idx]}")` : ""),
          ...Array(5).fill("").map((_, idx) => r.after[idx] ? `=IMAGE("${r.after[idx]}")` : ""),
          r.owner, r.remarks
        ])
      ];

      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:append?valueInputOption=USER_ENTERED`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values })
      });

      alert("Sync Complete!");
      window.open(`https://docs.google.com/spreadsheets/d/${spreadsheetId}`, '_blank');
    } catch (e) { alert("Sync Error!"); }
    setIsSyncing(false);
  };

  const addRow = () => setRows([...rows, { id: Date.now(), date: '2026-04-14', desc: '', loggedBy: '', status: 'Open', before: [], after: [], owner: '', remarks: '' }]);
  const deleteRow = (id) => setRows(rows.filter(r => r.id !== id));

  return (
    <div style={ui.container}>
      <header style={ui.nav}>
        {!accessToken ? <button onClick={handleLogin} style={ui.authBtn}>Connect Google</button> : <span style={{color:'#92d050'}}>✓ Connected</span>}
        <input value={project} onChange={e => setProject(e.target.value)} style={ui.headIn} />
      </header>
      <div style={ui.main}>
        {rows.map((row, index) => (
          <div key={row.id} style={ui.card}>
            <div style={ui.topRow}>
              <span>S.No: {index + 1}</span>
              <button onClick={() => deleteRow(row.id)} style={ui.delBtn}>Delete</button>
              <select value={row.status} onChange={e => setRows(rows.map(r => r.id===row.id?{...r, status: e.target.value}:r))} style={ui.statusIn}>
                <option>Open</option><option>Done</option>
              </select>
            </div>
            <div style={ui.grid}>
              <input type="date" value={row.date} onChange={e => setRows(rows.map(r => r.id===row.id?{...r, date: e.target.value}:r))} style={ui.field}/>
              <input placeholder="Logged By" value={row.loggedBy} onChange={e => setRows(rows.map(r => r.id===row.id?{...r, loggedBy: e.target.value}:r))} style={ui.field}/>
            </div>
            <textarea placeholder="Description" value={row.desc} onChange={e => setRows(rows.map(r => r.id===row.id?{...r, desc: e.target.value}:r))} style={ui.area}/>
            <div style={ui.photoGrid}>
              <label style={ui.upBtn}>📸 Before ({row.before.length})<input type="file" multiple hidden onChange={e => uploadPhoto(row.id, 'before', e.target.files)}/></label>
              <label style={ui.upBtn}>📸 After ({row.after.length})<input type="file" multiple hidden onChange={e => uploadPhoto(row.id, 'after', e.target.files)}/></label>
            </div>
            <input placeholder="Remarks" value={row.remarks} onChange={e => setRows(rows.map(r => r.id===row.id?{...r, remarks: e.target.value}:r))} style={ui.field}/>
          </div>
        ))}
      </div>
      <div style={ui.footer}>
        <button onClick={addRow} style={ui.btnG}>+ ROW</button>
        <button onClick={syncToSheets} disabled={isSyncing} style={ui.btnB}>{isSyncing ? "Syncing..." : "SYNC TO SHEETS"}</button>
      </div>
    </div>
  );
}

const ui = {
  container: { background: '#f4f7fa', minHeight: '100vh', paddingBottom: '100px', fontFamily: 'Arial' },
  nav: { background: '#1a1c1e', padding: '15px', position: 'sticky', top: 0, zIndex: 10, display: 'flex', flexDirection: 'column', gap: '8px' },
  authBtn: { background: '#4285F4', color: '#fff', border: 'none', padding: '10px', borderRadius: '4px', fontWeight: 'bold' },
  headIn: { width: '100%', background: 'transparent', border: '1px solid #fff', borderRadius: '4px', color: '#fff', textAlign: 'center', fontSize: '18px' },
  main: { padding: '12px' },
  card: { background: '#fff', borderRadius: '10px', padding: '15px', marginBottom: '15px', border: '1px solid #e0e6ed' },
  topRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' },
  field: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ced4da' },
  area: { width: '100%', height: '60px', padding: '10px', borderRadius: '6px', border: '1px solid #ced4da', marginBottom: '10px' },
  photoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' },
  upBtn: { background: '#f8f9fa', padding: '10px', textAlign: 'center', borderRadius: '6px', border: '1px dashed #adb5bd', cursor: 'pointer', fontSize: '12px' },
  footer: { position: 'fixed', bottom: 0, width: '100%', background: '#fff', padding: '15px', display: 'flex', gap: '10px', boxShadow: '0 -2px 10px rgba(0,0,0,0.1)' },
  btnG: { flex: 1, padding: '15px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' },
  btnB: { flex: 2, padding: '15px', background: '#4285F4', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' },
  delBtn: { background: 'none', border: '1px solid #dc3545', color: '#dc3545', borderRadius: '4px', padding: '2px 8px', fontSize: '11px' },
  statusIn: { borderRadius: '4px', border: '1px solid #ced4da' }
};
