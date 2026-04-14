import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// UNGA CREDENTIALS
const CLIENT_ID = "683400126186-f3a9u3fbe6l50bv1vidci7oinq7socn6.apps.googleusercontent.com";
const SCOPES = "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets";

export default function FinalTenColumnRegister() {
  const [project, setProject] = useState("FLORA VILLA-75E");
  const [rows, setRows] = useState(() => {
    const saved = localStorage.getItem('site_v20_final');
    return saved ? JSON.parse(saved) : [{ 
      id: 1, date: '2026-04-13', desc: '', loggedBy: '', 
      status: 'Open', closedDate: '', before: [], after: [], 
      owner: '', closedBy: '', remarks: '' 
    }];
  });

  const [accessToken, setAccessToken] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Auto-load Google Script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
    
    localStorage.setItem('site_v20_final', JSON.stringify(rows));
    
    return () => { if(document.body.contains(script)) document.body.removeChild(script); };
  }, [rows]);

  // GOOGLE LOGIN LOGIC
  const handleLogin = () => {
    if (!window.google) return alert("Google Script ready aagala. Refresh pannunga!");
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (response) => {
        if (response.access_token) {
          setAccessToken(response.access_token);
          alert("Google Drive Connected!");
        }
      },
    });
    client.requestAccessToken();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${day}-${month}-${year}`;
  };

  const addRow = () => {
    const newId = rows.length > 0 ? Math.max(...rows.map(r => r.id)) + 1 : 1;
    setRows([...rows, { id: newId, date: '2026-04-13', desc: '', loggedBy: '', status: 'Open', closedDate: '', before: [], after: [], owner: '', closedBy: '', remarks: '' }]);
  };

  const deleteRow = (id) => {
    if (window.confirm("Indha row-ah delete panna poringala?")) {
      setRows(rows.filter(row => row.id !== id));
    }
  };

  const clearAll = () => {
    if (window.confirm("Ella data-vum delete aagidum. Sure-ah?")) {
      setRows([{ id: 1, date: '2026-04-13', desc: '', loggedBy: '', status: 'Open', closedDate: '', before: [], after: [], owner: '', closedBy: '', remarks: '' }]);
      localStorage.removeItem('site_v20_final');
    }
  };

  // UPLOAD TO GOOGLE DRIVE (Replaced Cloudinary)
  const uploadPhoto = async (id, type, files) => {
    if (!accessToken) return alert("Modhala Login with Google pannunga!");
    setIsUploading(true);
    
    for (const file of Array.from(files)) {
      const metadata = {
        name: `${project}_${type}_${Date.now()}.jpg`,
        mimeType: file.type
      };

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
        // data.webViewLink-ah row-la save pannuvom
        setRows(prev => prev.map(r => r.id === id ? { ...r, [type]: [...r[type], data.webViewLink] } : r));
      } catch (e) {
        console.error("Drive upload error", e);
      }
    }
    setIsUploading(false);
  };

  const deletePhoto = (rowId, type, photoIndex) => {
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, [type]: r[type].filter((_, index) => index !== photoIndex) } : r));
  };

  const generatePDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    autoTable(doc, {
      body: [[project.toUpperCase(), 'ACTION REGISTER - NEW']],
      theme: 'grid',
      styles: { fontSize: 12, fontStyle: 'bold', halign: 'left', cellPadding: 3, fillColor: [211, 211, 211], lineWidth: 0.5, lineColor: [0, 0, 0] },
      columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 177 } }
    });

    const maxBefore = Math.max(...rows.map(r => r.before.length), 1);
    const maxAfter = Math.max(...rows.map(r => r.after.length), 1);
    const head = [['S.No', 'Date Logged', 'Description', 'Logged by', 'Current Status', 'Actual Closed Date', ...Array.from({ length: maxBefore }, (_, i) => `P${i + 1}(B)`), ...Array.from({ length: maxAfter }, (_, i) => `P${i + 1}(A)`), 'Owner', 'Remarks']];

    const body = rows.map((r, index) => [
      index + 1, formatDate(r.date), r.desc, r.loggedBy, r.status.toUpperCase(), formatDate(r.closedDate),
      ...Array(maxBefore + maxAfter).fill(''), 
      r.owner, r.remarks.toUpperCase()
    ]);

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY,
      head: head,
      body: body,
      theme: 'grid',
      styles: { fontSize: 6, halign: 'center', valign: 'middle', minCellHeight: 25, lineWidth: 0.1, lineColor: [0, 0, 0] },
      headStyles: { fillColor: [40, 44, 52], textColor: [255, 255, 255], fontStyle: 'bold' },
      didDrawCell: (data) => {
        if (data.section === 'head') return;
        const rowData = rows[data.row.index];
        if (data.column.index === 4) {
          if (rowData.status.toUpperCase() === 'OPEN') data.cell.styles.fillColor = [255, 0, 0];
          if (rowData.status.toUpperCase() === 'DONE') data.cell.styles.fillColor = [146, 208, 80];
        }
      }
    });
    doc.save(`${project}_Final_Report.pdf`);
  };

  return (
    <div style={ui.container}>
      <header style={ui.nav}>
        {!accessToken ? (
          <button onClick={handleLogin} style={ui.authBtn}>Login to Drive</button>
        ) : (
          <div style={{color:'#92d050', fontSize:'12px', textAlign:'center'}}>✓ Drive Connected</div>
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
              <input style={{...ui.badge, backgroundColor: row.status.toUpperCase()==='OPEN'?'#ff0000':'#92d050'}} value={row.status} onChange={e => setRows(rows.map(r => r.id===row.id?{...r, status: e.target.value}:r))} />
            </div>
            <div style={ui.inputGrid}>
              <input type="date" style={ui.field} value={row.date} onChange={e => setRows(rows.map(r => r.id===row.id?{...r, date: e.target.value}:r))} />
              <input placeholder="Logged By" style={ui.field} value={row.loggedBy} onChange={e => setRows(rows.map(r => r.id===row.id?{...r, loggedBy: e.target.value}:r))} />
            </div>
            <textarea placeholder="Description" style={ui.area} value={row.desc} onChange={e => setRows(rows.map(r => r.id===row.id?{...r, desc: e.target.value}:r))} />
            <div style={ui.inputGrid}>
               <div style={{fontSize:'10px'}}>Closed Date: <input type="date" style={ui.field} value={row.closedDate} onChange={e => setRows(rows.map(r => r.id===row.id?{...r, closedDate: e.target.value}:r))} /></div>
               <input placeholder="Owner" style={ui.field} value={row.owner} onChange={e => setRows(rows.map(r => r.id===row.id?{...r, owner: e.target.value}:r))} />
            </div>
            
            <div style={ui.photoGrid}>
              <div style={ui.uploadSection}>
                <label style={ui.upBtn}>📸 Before ({row.before.length}) <input type="file" multiple hidden onChange={e => uploadPhoto(row.id, 'before', e.target.files)} /></label>
                <div style={ui.thumbnailRow}>
                  {row.before.map((url, idx) => (
                    <div key={idx} style={ui.thumbWrap}><img src={url} style={ui.thumbImg} /><button onClick={() => deletePhoto(row.id, 'before', idx)} style={ui.delBtn}>×</button></div>
                  ))}
                </div>
              </div>
              <div style={ui.uploadSection}>
                <label style={ui.upBtn}>📸 After ({row.after.length}) <input type="file" multiple hidden onChange={e => uploadPhoto(row.id, 'after', e.target.files)} /></label>
                <div style={ui.thumbnailRow}>
                  {row.after.map((url, idx) => (
                    <div key={idx} style={ui.thumbWrap}><img src={url} style={ui.thumbImg} /><button onClick={() => deletePhoto(row.id, 'after', idx)} style={ui.delBtn}>×</button></div>
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
        <button onClick={generatePDF} disabled={isUploading} style={ui.btnBlue}>{isUploading ? 'Uploading...' : 'GET PDF'}</button>
        <button onClick={clearAll} style={ui.btnRed}>CLEAR ALL</button>
      </div>
    </div>
  );
}

const ui = {
  container: { background: '#f4f7fa', minHeight: '100vh', paddingBottom: '110px', fontFamily: 'Arial' },
  nav: { background: '#1a1c1e', padding: '15px', position: 'sticky', top: 0, zIndex: 10, display: 'flex', flexDirection: 'column', gap: '8px' },
  authBtn: { background: '#4285F4', color: '#fff', border: 'none', padding: '10px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' },
  headIn: { width: '100%', background: 'transparent', border: '1px solid #fff', borderRadius: '4px', color: '#fff', textAlign: 'center', fontSize: '18px', fontWeight: 'bold' },
  main: { padding: '12px' },
  card: { background: '#fff', borderRadius: '10px', padding: '15px', marginBottom: '15px', border: '1px solid #e0e6ed' },
  topRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' },
  snoBadge: { fontSize: '14px', fontWeight: 'bold', color: '#333' },
  rowDelBtn: { background: '#fff', border: '1px solid #dc3545', color: '#dc3545', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', cursor: 'pointer' },
  badge: { border: 'none', borderRadius: '4px', color: '#fff', padding: '5px', width: '80px', textAlign: 'center', fontSize: '12px' },
  inputGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' },
  field: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ced4da', boxSizing: 'border-box' },
  area: { width: '100%', height: '65px', borderRadius: '6px', border: '1px solid #ced4da', padding: '10px', boxSizing: 'border-box', marginBottom: '10px' },
  photoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' },
  upBtn: { background: '#f8f9fa', padding: '12px', textAlign: 'center', borderRadius: '6px', border: '1px dashed #adb5bd', fontSize: '12px', cursor: 'pointer', display: 'block' },
  uploadSection: { display: 'flex', flexDirection: 'column', gap: '5px' },
  thumbnailRow: { display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '5px' },
  thumbWrap: { position: 'relative', width: '40px', height: '40px' },
  thumbImg: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' },
  delBtn: { position: 'absolute', top: '-5px', right: '-5px', background: '#ff3b30', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  footer: { position: 'fixed', bottom: 0, width: '100%', background: '#fff', padding: '15px', display: 'flex', gap: '10px', boxShadow: '0 -2px 10px rgba(0,0,0,0.1)', boxSizing: 'border-box' },
  btnGreen: { flex: 1, padding: '15px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' },
  btnBlue: { flex: 1, padding: '15px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' },
  btnRed: { padding: '15px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' }
};
