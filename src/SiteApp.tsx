import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ExcelReplicaRegister() {
  const [project, setProject] = useState("FLORA VILLA-75E");
  const [rows, setRows] = useState(() => {
    const saved = localStorage.getItem('site_v12_excel');
    return saved ? JSON.parse(saved) : [{ 
      id: 1, date: '13-04-2026', desc: '', loggedBy: '', 
      status: 'Open', closedDate: '', before: [], after: [], 
      owner: '', closedBy: '', remarks: '' 
    }];
  });

  const [isUploading, setIsUploading] = useState(false);

  // Cloudinary Config
  const CLOUD_NAME = "ddkgr27ds"; 
  const UPLOAD_PRESET = "ml_default"; 

  useEffect(() => {
    localStorage.setItem('site_v12_excel', JSON.stringify(rows));
  }, [rows]);

  const addRow = () => {
    const newId = rows.length > 0 ? rows[rows.length - 1].id + 1 : 1;
    setRows([...rows, { 
      id: newId, date: '13-04-2026', desc: '', loggedBy: '', 
      status: 'Open', closedDate: '', before: [], after: [], 
      owner: '', closedBy: '', remarks: '' 
    }]);
  };

  const uploadPhoto = async (id, type, files) => {
    setIsUploading(true);
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);
      try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
        const data = await res.json();
        setRows(prev => prev.map(r => r.id === id ? { ...r, [type]: [...r[type], data.secure_url] } : r));
      } catch (e) { console.error("Upload error"); }
    }
    setIsUploading(false);
  };

  const generatePDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    
    // Exact Excel Header Look 
    autoTable(doc, {
      body: [[project.toUpperCase(), 'ACTION REGISTER - NEW']],
      theme: 'grid',
      styles: { 
        fontSize: 14, 
        fontStyle: 'bold', 
        halign: 'center', 
        fillColor: [211, 211, 211], 
        lineWidth: 0.5, 
        lineColor: [0, 0, 0] 
      },
      columnStyles: { 0: { cellWidth: 135 }, 1: { cellWidth: 135 } }
    });

    // Defining Exact Headers from Sharook 1 
    const head = [[
      'S.No', 'Date Logged', 'Description', 'Logged by', 
      'Current Status', 'Actual Closed Date', 'Photos before', 
      'Photos After', 'Owner', 'Closed By', 'Remarks'
    ]];

    const body = rows.map(r => [
      r.id, r.date, r.desc, r.loggedBy, r.status.toUpperCase(), 
      r.closedDate, '', '', r.owner, r.closedBy, r.remarks.toUpperCase()
    ]);

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 2,
      head: head,
      body: body,
      theme: 'grid',
      styles: { 
        fontSize: 7, 
        font: "helvetica",
        halign: 'center', 
        valign: 'middle', 
        minCellHeight: 45, // Set for large photo display 
        lineWidth: 0.2, 
        lineColor: [0, 0, 0] 
      },
      headStyles: { 
        fillColor: [40, 44, 52], 
        textColor: [255, 255, 255], 
        fontSize: 8, 
        fontStyle: 'bold' 
      },
      columnStyles: { 
        2: { cellWidth: 35, halign: 'left' }, // Description
        6: { cellWidth: 35 }, // Photos Before
        7: { cellWidth: 35 }, // Photos After
        10: { cellWidth: 25 }  // Remarks
      },

      didDrawCell: (data) => {
        if (data.section === 'head') return;
        const rowData = rows[data.row.index];

        // 1. Current Status Color Coding 
        if (data.column.index === 4) {
          const s = rowData.status.toUpperCase();
          if (s === 'OPEN') data.cell.styles.fillColor = [255, 0, 0]; // Exact Red
          if (s === 'DONE') data.cell.styles.fillColor = [146, 208, 80]; // Exact Green
        }

        // 2. Remarks Color Coding (Sharook 1 Replica) 
        if (data.column.index === 10) {
          const rem = rowData.remarks.toUpperCase();
          if (rem === 'DONE') data.cell.styles.fillColor = [0, 255, 0];
          if (rem.includes('NOT IN BOND')) data.cell.styles.fillColor = [255, 192, 0]; // Yellow
          if (rem.includes('UNABLE')) data.cell.styles.fillColor = [255, 0, 0];
        }

        // 3. Exact Photo Alignment (1, 2, 3...) [cite: 283]
        const drawPhotos = (urls, cell) => {
          urls.slice(0, 4).forEach((url, i) => {
            const xOffset = cell.x + (i % 2 === 0 ? 1 : 18);
            const yOffset = cell.y + (Math.floor(i / 2) * 20) + 2;
            doc.setFontSize(5);
            doc.text(`Photo ${i + 1}`, xOffset, yOffset + 1);
            doc.addImage(url, 'JPEG', xOffset, yOffset + 2, 15, 15);
          });
        };

        if (data.column.index === 6) drawPhotos(rowData.before, data.cell);
        if (data.column.index === 7) drawPhotos(rowData.after, data.cell);
      }
    });

    doc.save(`${project}_Excel_Report.pdf`);
  };

  return (
    <div style={styles.container}>
      <header style={styles.nav}>
        <input value={project} onChange={e => setProject(e.target.value)} style={styles.headInput} />
      </header>
      
      <div style={styles.main}>
        {rows.map(row => (
          <div key={row.id} style={styles.card}>
            <div style={styles.cardTop}>
              <span style={styles.idLabel}>S.No: {row.id}</span>
              <input 
                style={{...styles.badge, backgroundColor: row.status.toUpperCase()==='OPEN'?'#ff0000':'#92d050'}} 
                value={row.status} 
                onChange={e => setRows(rows.map(r => r.id===row.id?{...r, status: e.target.value}:r))} 
              />
            </div>
            
            <div style={styles.inputGroup}>
              <input placeholder="Logged By" style={styles.field} value={row.loggedBy} onChange={e => setRows(rows.map(r => r.id===row.id?{...r, loggedBy: e.target.value}:r))} />
              <input type="date" style={styles.field} value={row.date} onChange={e => setRows(rows.map(r => r.id===row.id?{...r, date: e.target.value}:r))} />
            </div>

            <textarea placeholder="Work Description" style={styles.area} value={row.desc} onChange={e => setRows(rows.map(r => r.id===row.id?{...r, desc: e.target.value}:r))} />
            
            <div style={styles.photoGrid}>
              <label style={styles.upBtn}>📸 Before ({row.before.length}) <input type="file" multiple hidden onChange={e => uploadPhoto(row.id, 'before', e.target.files)} /></label>
              <label style={styles.upBtn}>📸 After ({row.after.length}) <input type="file" multiple hidden onChange={e => uploadPhoto(row.id, 'after', e.target.files)} /></label>
            </div>
            
            <input placeholder="Remarks (DONE / NOT IN BOND SCOPE)" style={styles.field} value={row.remarks} onChange={e => setRows(rows.map(r => r.id===row.id?{...r, remarks: e.target.value}:r))} />
          </div>
        ))}
      </div>

      <div style={styles.footer}>
        <button onClick={addRow} style={styles.btnGreen}>+ ADD ROW</button>
        <button onClick={generatePDF} disabled={isUploading} style={styles.btnBlue}>{isUploading ? 'SYNCING...' : 'GET PDF'}</button>
      </div>
    </div>
  );
}

const styles = {
  container: { background: '#f0f3f7', minHeight: '100vh', paddingBottom: '100px', fontFamily: 'Arial' },
  nav: { background: '#1c1e21', padding: '15px', position: 'sticky', top: 0, zIndex: 100 },
  headInput: { width: '100%', background: 'transparent', border: '1px solid #fff', borderRadius: '4px', color: '#fff', textAlign: 'center', fontSize: '20px', fontWeight: 'bold' },
  main: { padding: '12px' },
  card: { background: '#fff', borderRadius: '8px', padding: '15px', marginBottom: '15px', border: '1px solid #d1d9e0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  cardTop: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px' },
  idLabel: { fontWeight: 'bold', color: '#333' },
  badge: { border: 'none', borderRadius: '3px', color: '#fff', padding: '4px 10px', width: '80px', textAlign: 'center', fontWeight: 'bold', fontSize: '11px' },
  inputGroup: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' },
  field: { width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ced4da', boxSizing: 'border-box' },
  area: { width: '100%', height: '60px', borderRadius: '4px', border: '1px solid #ced4da', padding: '10px', boxSizing: 'border-box', marginBottom: '10px' },
  photoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' },
  upBtn: { background: '#f8f9fa', padding: '12px', textAlign: 'center', borderRadius: '6px', border: '1px dashed #6c757d', fontSize: '12px', cursor: 'pointer' },
  footer: { position: 'fixed', bottom: 0, width: '100%', background: '#fff', padding: '15px', display: 'flex', gap: '10px', borderTop: '1px solid #ddd' },
  btnGreen: { flex: 1, padding: '15px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold' },
  btnBlue: { flex: 1, padding: '15px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold' }
};
