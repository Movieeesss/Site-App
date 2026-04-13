import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function UniqActionRegisterFinal() {
  const [projectTitle, setProjectTitle] = useState("FLORA VILLA-75E");
  const [rows, setRows] = useState(() => {
    const saved = localStorage.getItem('site_action_data_final_v4');
    return saved ? JSON.parse(saved) : [{ id: 1, date: '7-May-25', desc: '', loggedBy: '', status: 'Open', closedDate: '', before: [], after: [], owner: '', closedBy: '', remarks: '' }];
  });

  useEffect(() => {
    localStorage.setItem('site_action_data_final_v4', JSON.stringify(rows));
  }, [rows]);

  const addRow = () => {
    const newId = rows.length > 0 ? rows[rows.length - 1].id + 1 : 1;
    setRows([...rows, { id: newId, date: '', desc: '', loggedBy: '', status: 'Open', closedDate: '', before: [], after: [], owner: '', closedBy: '', remarks: '' }]);
  };

  const clearAll = () => {
    if (window.confirm("Kandippa ella data-vum delete pannanuma?")) {
      setRows([{ id: 1, date: '7-May-25', desc: '', loggedBy: '', status: 'Open', closedDate: '', before: [], after: [], owner: '', closedBy: '', remarks: '' }]);
      localStorage.removeItem('site_action_data_final_v4');
    }
  };

  // Lag fix: white screen varama irukka compression heavy-ah panniyachu
  const handlePhotoUpload = (id, type, files) => {
    const fileArray = Array.from(files);
    fileArray.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const maxWidth = 200; // Smaller width to save memory
          const scaleSize = maxWidth / img.width;
          canvas.width = maxWidth;
          canvas.height = img.height * scaleSize;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressed = canvas.toDataURL('image/jpeg', 0.5); // Quality reduced to 0.5 to stop white screen
          setRows(prev => prev.map(r => r.id === id ? { ...r, [type]: [...r[type], compressed] } : r));
        };
      };
      reader.readAsDataURL(file);
    });
  };

  const generatePDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    
    // Title Header
    autoTable(doc, {
      body: [[projectTitle.toUpperCase(), 'ACTION REGISTER - NEW']],
      theme: 'grid',
      styles: { fontSize: 11, fontStyle: 'bold', halign: 'center', fillColor: [211, 211, 211], lineWidth: 0.5 },
      columnStyles: { 0: { cellWidth: 138 }, 1: { cellWidth: 138 } }
    });

    const tableData = rows.map(r => [
      r.id, r.date, r.desc, r.loggedBy, r.status, r.closedDate, '', '', r.owner, r.closedBy, r.remarks
    ]);

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 1,
      head: [['ID', 'Date', 'Description', 'Logged by', 'Status', 'Closed Date', 'Photos Before', 'Photos After', 'Owner', 'Closed By', 'Remarks']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 7, halign: 'center', valign: 'middle', lineWidth: 0.2, lineColor: [0, 0, 0], minCellHeight: 45 },
      headStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0], fontStyle: 'bold' },
      columnStyles: {
        6: { cellWidth: 35 }, // Photos Before column fixed width
        7: { cellWidth: 35 }, // Photos After column fixed width
      },
      didDrawCell: (data) => {
        if (data.section === 'head') return;
        const rowIndex = data.row.index;
        const rowData = rows[rowIndex];

        // Status & Remarks color coding
        if (data.column.index === 4) {
          const s = rowData.status.toUpperCase();
          if (s === 'OPEN') data.cell.styles.fillColor = [255, 0, 0];
          if (s === 'DONE') data.cell.styles.fillColor = [146, 208, 80];
        }
        if (data.column.index === 10) {
          const rem = rowData.remarks.toUpperCase();
          if (rem === 'DONE') data.cell.styles.fillColor = [0, 255, 0];
          if (rem.includes('UNABLE')) data.cell.styles.fillColor = [255, 0, 0];
        }

        // Photo Rendering with "Photo 1, 2, 3..." labels like Sharook 2
        const renderPhotosWithLabels = (imgs, cell) => {
          imgs.forEach((img, i) => {
            const yOffset = 4 + (i * 12); // Vertical stack to prevent "wider" photos
            if (i < 3) { // Max 3 photos per cell for memory safety
              doc.setFontSize(6);
              doc.text(`Photo ${i + 1}`, cell.x + 2, cell.y + yOffset);
              doc.addImage(img, 'JPEG', cell.x + 2, cell.y + yOffset + 1, 30, 10);
            }
          });
        };

        if (data.column.index === 6) renderPhotosWithLabels(rowData.before, data.cell);
        if (data.column.index === 7) renderPhotosWithLabels(rowData.after, data.cell);
      }
    });

    doc.save(`${projectTitle}.pdf`);
  };

  return (
    <div style={container}>
      <div style={header}>
        <input value={projectTitle} onChange={e => setProjectTitle(e.target.value)} style={headIn} />
      </div>

      <div style={cardList}>
        {rows.map(row => (
          <div key={row.id} style={card}>
            <div style={cardHeader}>
              <span>ID #{row.id}</span>
              <input 
                style={{...statusIn, backgroundColor: row.status.toUpperCase()==='OPEN' ? '#ff4d4d':'#92d050'}} 
                value={row.status} 
                onChange={e => setRows(rows.map(r => r.id === row.id ? {...r, status: e.target.value} : r))} 
              />
            </div>
            <textarea placeholder="Description" style={area} value={row.desc} onChange={e => setRows(rows.map(r => r.id === row.id ? {...r, desc: e.target.value} : r))} />
            
            <div style={photoSection}>
              <label style={uploadBtn}>📸 Before ({row.before.length}) <input type="file" multiple hidden onChange={e => handlePhotoUpload(row.id, 'before', e.target.files)} /></label>
              <label style={uploadBtn}>📸 After ({row.after.length}) <input type="file" multiple hidden onChange={e => handlePhotoUpload(row.id, 'after', e.target.files)} /></label>
            </div>

            <input placeholder="Remarks" style={input} value={row.remarks} onChange={e => setRows(rows.map(r => r.id === row.id ? {...r, remarks: e.target.value} : r))} />
          </div>
        ))}
      </div>

      <div style={stickyFooter}>
        <button onClick={addRow} style={addBtn}>+ ROW</button>
        <button onClick={generatePDF} style={pdfBtn}>GET PDF</button>
        <button onClick={clearAll} style={clearBtn}>CLEAR ALL</button>
      </div>
    </div>
  );
}

// Mobile styles
const container = { background: '#f4f4f4', minHeight: '100vh', paddingBottom: '90px' };
const header = { background: '#212529', padding: '15px', position: 'sticky', top: 0, zIndex: 10 };
const headIn = { width: '100%', background: 'transparent', border: '1px solid #fff', color: '#fff', textAlign: 'center', fontSize: '18px' };
const cardList = { padding: '12px' };
const card = { background: '#fff', borderRadius: '8px', padding: '15px', marginBottom: '15px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' };
const cardHeader = { display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontWeight: 'bold' };
const statusIn = { border: 'none', borderRadius: '4px', color: '#fff', padding: '5px', width: '80px', textAlign: 'center', fontSize: '12px' };
const area = { width: '100%', height: '60px', borderRadius: '5px', border: '1px solid #ccc', padding: '8px', boxSizing: 'border-box' };
const input = { width: '100%', marginTop: '8px', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' };
const photoSection = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', margin: '12px 0' };
const uploadBtn = { background: '#f8f9fa', border: '1px dashed #6c757d', padding: '10px', textAlign: 'center', borderRadius: '5px', fontSize: '12px' };
const stickyFooter = { position: 'fixed', bottom: 0, width: '100%', background: '#fff', padding: '12px', display: 'flex', gap: '8px', boxShadow: '0 -2px 10px rgba(0,0,0,0.1)', boxSizing: 'border-box' };
const addBtn = { flex: 1, padding: '12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '5px', fontWeight: 'bold' };
const pdfBtn = { flex: 1, padding: '12px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '5px', fontWeight: 'bold' };
const clearBtn = { flex: 1, padding: '12px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '5px', fontWeight: 'bold' };
