import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// UPDATED WITH YOUR NEW KEYS
const CLIENT_ID = "683400126186-f3a9u3fbe6l50bv1vidci7oinq7socn6.apps.googleusercontent.com";
const SCOPES = "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets";

export default function ProfessionalSiteRegister() {
  const [project, setProject] = useState("FLORA VILLA-75E");
  const [rows, setRows] = useState(() => {
    const saved = localStorage.getItem('site_v22_final');
    return saved ? JSON.parse(saved) : [{ 
      id: Date.now(), date: '2026-04-14', desc: '', loggedBy: '', 
      status: 'Open', closedDate: '', before: [], after: [], 
      owner: '', remarks: '' 
    }];
  });

  const [accessToken, setAccessToken] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Auto-load Google Script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
    localStorage.setItem('site_v22_final', JSON.stringify(rows));
    return () => { if(document.body.contains(script)) document.body.removeChild(script); };
  }, [rows]);

  const handleLogin = () => {
    if (!window.google) return alert("Google Script load aagala. 2 sec wait panni try pannunga!");
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (response) => {
        if (response.access_token) {
          setAccessToken(response.access_token);
          alert("Google Connected Successfully!");
        }
      },
    });
    client.requestAccessToken();
  };

  const uploadPhoto = async (rowId, type, files) => {
    if (!accessToken) return alert("Modhala Login with Google pannunga!");
    setIsUploading(true);
    for (const file of Array.from(files)) {
      const metadata = { name: `${project}_${type}_${Date.now()}.jpg`, mimeType: 'image/jpeg' };
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', file);
      try {
        const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}` },
          body: form
        });
        const data = await res.json();
        setRows(prev => prev.map(r => r.id === rowId ? { ...r, [type]: [...r[type], data.webViewLink] } : r));
      } catch (e) { console.error("Upload error", e); }
    }
    setIsUploading(false);
  };

  const deletePhoto = (rowId, type, photoIndex) => {
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, [type]: r[type].filter((_, index) => index !== photoIndex) } : r));
  };

  const addRow = () => {
    setRows([...rows, { id: Date.now(), date: '2026-04-14', desc: '', loggedBy: '', status: 'Open', closedDate: '', before: [], after: [], owner: '', remarks: '' }]);
  };

  const deleteRow = (id) => {
    if (window.confirm("Indha row-ah delete panna poringala?")) {
      setRows(rows.filter(r => r.id !== id));
    }
  };

  const clearAll = () => {
    if (window.confirm("Ella data-vum delete aagidum. Sure-ah?")) {
      setRows([{ id: Date.now(), date: '2026-04-14', desc: '', loggedBy: '', status: 'Open', closedDate: '', before: [], after: [], owner: '', remarks: '' }]);
      localStorage.removeItem('site_v22_final');
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    autoTable(doc, {
      body: [[project.toUpperCase(), 'ACTION REGISTER - NEW']],
      theme: 'grid',
      styles: { fontSize: 12, fontStyle: 'bold', halign: 'left', fillColor: [211, 211, 211], lineWidth: 0.5, lineColor: [0, 0, 0] },
      columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 177 } }
    });

    const head = [['S.No', 'Date', 'Description', 'Logged by', 'Status', 'Remarks']];
    const body = rows.map((r, i) => [i + 1, r.date, r.desc, r.loggedBy, r.status, r.remarks]);

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY,
      head: head,
      body: body,
      theme: 'grid',
      styles: { fontSize: 8, halign: 'center' },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
          data.cell.styles.fillColor = rows[data.row.index].status.toUpperCase() === 'OPEN' ? [255, 0, 0] : [146, 208, 80];
        }
      }
    });
    doc.save(`${project}_Report.pdf`);
  };

  const saveToSheets = async () => {
    if (!accessToken) return alert("Login with Google First!");
    setIsSyncing(true);
    try {
      const sheetRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ properties: { title: `${project}_Report_${new Date().toLocaleDateString()}` } })
      });
      const sheetData = await sheetRes.json();
      const spreadsheetId = sheetData.spreadsheetId;
      const values = [
        ["S.No", "Date", "Description", "Logged By", "Status", "Remarks", "Before Links", "After Links"],
        ...rows.map((r, i) => [i + 1, r.date, r.desc, r.loggedBy, r.status, r.remarks, r.before.join(", "), r.after.join(", ")])
      ];
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:append?valueInputOption=USER_ENTERED`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values })
      });
      alert("Successfully Saved to Google Sheets!");
      window.open(`https://docs.google.com/spreadsheets/d/${spreadsheetId}`, '_blank');
    } catch (e) { alert("Sync Error!"); }
    setIsSyncing(false);
  };

  return (
    <div style={ui.container}>
      <header style={ui.nav}>
        {!accessToken ? (
          <button onClick={handleLogin} style={ui.authBtn}>G+ Login with Google</button>
        ) : (
          <div style={{color:'#92d050', fontSize:'14px', fontWeight:'bold', textAlign:'center'}}>✓ Google Connected</div>
        )}
        <input value={project} onChange={e => setProject(e.target.value)} style={ui.headIn} />
      </header>

      <div style={ui.main}>
        {rows.map((row, index) => (
          <div key={row.id} style={ui.card}>
            <div style={ui.topRow}>
              <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                <span style={ui.snoBadge}>S.No: {index + 1}</span>
                <button onClick={() => deleteRow(row.id)} style={ui.rowDelBtn}>Delete</button>
              </div>
              <input 
                style={{...ui.badge, backgroundColor: row.status.toUpperCase()==='OPEN'?'#ff0000':'#92d050'}} 
                value={row.status} 
                onChange={e => setRows(rows.map(r => r.id===row.id?{...r, status: e.target.value}:r))} 
              />
            </div>
            
            <div style={ui.inputGrid}>
              <input type="date" style={ui.field} value={row.date} onChange={e => setRows(rows.map(r => r.id===row.id?{...r, date: e.target.value}:r))} />
              <input placeholder="Logged By" style={ui.field} value={row.loggedBy} onChange={e => setRows(rows.map(r => r.id===row.id?{...r, loggedBy: e.target.value}:r))} />
            </div>
            <textarea placeholder="Description" style={ui.area} value={row.desc} onChange={e => setRows(rows.map(r => r.id===row.id?{...r, desc: e.target.value}:r))} />
            
            <div style={ui.photoGrid}>
              <div style={ui.uploadSection}>
                <label style={ui.upBtn}>📸 Before ({row.before.length}) <input type="file" multiple hidden onChange={e => uploadPhoto(row.id, 'before', e.target.files)} /></label>
                <div style={ui.thumbnailRow}>
                  {row.before.map((url, idx) => (
                    <div key={idx} style={ui.thumbWrap}><img src={url} style={ui.thumbImg} alt="b"/><button onClick={() => deletePhoto(row.id, 'before', idx)} style={ui.delBtn}>×</button></div>
                  ))}
                </div>
              </div>
              <div style={ui.uploadSection}>
                <label style={ui.upBtn}>📸 After ({row.after.length}) <input type="file" multiple hidden onChange={e => uploadPhoto(row.id, 'after', e.target.files)} /></label>
                <div style={ui.thumbnailRow}>
                  {row.after.map((url, idx) => (
                    <div key={idx} style={ui.thumbWrap}><img src={url} style={ui.thumbImg} alt="a"/><button onClick={() => deletePhoto(row.id, 'after', idx)} style={ui.delBtn}>×</button></div>
                  ))}
                </div>
              </div>
            </div>

            <input placeholder="Remarks" style={ui.field} value={row.remarks} onChange={e => setRows(rows.map(r => r.id===row.id?{...r, remarks: e.target.value}:r))} />
          </div>
        ))}
      </div>

      <div style={ui.footer}>
        <button onClick={addRow} style={ui.btnGreen}>+ ROW</button>
        <button onClick={saveToSheets} disabled={isSyncing || isUploading} style={ui.btnBlue}>{isSyncing ? 'Syncing...' : 'SAVE SHEETS'}</button>
        <button onClick={generatePDF} style={ui.btnGray}>GET PDF</button>
        <button onClick={clearAll} style={ui.btnRed}>CLEAR</button>
      </div>
    </div>
  );
}

const ui = {
  container: { background: '#f4f7fa', minHeight: '100vh', paddingBottom: '140px', fontFamily: 'Arial' },
  nav: { background: '#1a1c1e', padding: '15px', position: 'sticky', top: 0, zIndex: 10, display: 'flex', flexDirection: 'column', gap: '8px' },
  authBtn: { background: '#4285F4', color: '#fff', border: 'none', padding: '10px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' },
  headIn: { width: '100%', background: 'transparent', border: '1px solid #fff', borderRadius: '4px', color: '#fff', textAlign: 'center', fontSize: '18px', fontWeight: 'bold' },
  main: { padding: '12px' },
  card: { background: '#fff', borderRadius: '10px', padding: '15px', marginBottom: '15px', border: '1px solid #e0e6ed' },
  topRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' },
  snoBadge: { fontSize: '14px', fontWeight: 'bold' },
  rowDelBtn: { background: 'none', border: '1px solid #dc3545', color: '#dc3545', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', cursor: 'pointer' },
  badge: { border: 'none', borderRadius: '4px', color: '#fff', padding: '5px', width: '80px', textAlign: 'center' },
  inputGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' },
  field: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ced4da', boxSizing: 'border-box' },
  area: { width: '100%', height: '65px', borderRadius: '6px', border: '1px solid #ced4da', padding: '10px', boxSizing: 'border-box', marginBottom: '10px' },
  photoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' },
  upBtn: { background: '#f8f9fa', padding: '10px', textAlign: 'center', borderRadius: '6px', border: '1px dashed #adb5bd', fontSize: '11px', cursor: 'pointer' },
  uploadSection: { display: 'flex', flexDirection: 'column', gap: '5px' },
  thumbnailRow: { display: 'flex', flexWrap: 'wrap', gap: '5px' },
  thumbWrap: { position: 'relative', width: '40px', height: '40px' },
  thumbImg: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' },
  delBtn: { position: 'absolute', top: '-5px', right: '-5px', background: '#ff3b30', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', cursor: 'pointer' },
  footer: { position: 'fixed', bottom: 0, width: '100%', background: '#fff', padding: '15px', display: 'flex', gap: '8px', boxShadow: '0 -2px 10px rgba(0,0,0,0.1)', boxSizing: 'border-box', flexWrap: 'wrap', zIndex: 100 },
  btnGreen: { flex: 1, padding: '12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', minWidth: '80px', cursor: 'pointer' },
  btnBlue: { flex: 1, padding: '12px', background: '#4285F4', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', minWidth: '80px', cursor: 'pointer' },
  btnGray: { flex: 1, padding: '12px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', minWidth: '80px', cursor: 'pointer' },
  btnRed: { padding: '12px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }
};
