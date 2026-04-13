import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ActionRegisterApp() {
  const [projectInfo, setProjectInfo] = useState(() => {
    const saved = localStorage.getItem('flora_project_info');
    return saved ? JSON.parse(saved) : { villa: 'villa-75E', title: 'ACTION REGISTER - NEW' };
  });

  const [rows, setRows] = useState(() => {
    const saved = localStorage.getItem('flora_rows');
    return saved ? JSON.parse(saved) : [{ id: 1, dateDesc: '', statusBy: '', closedDate: '', before: '', after: '', owner: '', closedBy: '', remarks: '' }];
  });

  const [loading, setLoading] = useState(false);

  // Auto-save text data only (to avoid storage crashes)
  useEffect(() => {
    const textRows = rows.map(({ before, after, ...rest }) => rest);
    localStorage.setItem('flora_rows_text', JSON.stringify(textRows));
    localStorage.setItem('flora_project_info', JSON.stringify(projectInfo));
  }, [rows, projectInfo]);

  const addRow = () => {
    const newId = rows.length + 1;
    setRows([...rows, { id: newId, dateDesc: '', statusBy: '', closedDate: '', before: '', after: '', owner: '', closedBy: '', remarks: '' }]);
  };

  const updateRow = (id, field, value) => {
    setRows(rows.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  // Optimized Image Upload to prevent White Screen
  const handleImage = (id, type, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400; // Resizing to prevent lag
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const optimizedData = canvas.toDataURL('image/jpeg', 0.7);
        updateRow(id, type, optimizedData);
      };
    };
    reader.readAsDataURL(file);
  };

  const generatePDF = async (mode) => {
    setLoading(true);
    const doc = new jsPDF('l', 'mm', 'a4');
    
    // Header - Sharook 1 Style
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`Flora ${projectInfo.villa} ${projectInfo.title}`, 14, 15);

    const body = rows.map(r => [
      r.id,
      r.dateDesc,
      r.statusBy,
      r.closedDate,
      '', // Before Photo
      '', // After Photo
      r.owner,
      r.closedBy,
      r.remarks
    ]);

    autoTable(doc, {
      startY: 22,
      head: [['S.No', 'Date Logged / Description', 'Current Status / Logged By', 'Actual Closed Date', 'Photos Before', 'Photos After', 'Owner', 'Closed By', 'Remarks']],
      body: body,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2, minCellHeight: 20, valign: 'middle' },
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
      didDrawCell: (data) => {
        const rowIndex = data.row.index;
        const rowData = rows[rowIndex];

        // 1. Color Coding Logic (Nee ketta Green/Red)
        if (data.column.index === 8) { // Remarks column
          const text = rowData.remarks.toUpperCase();
          if (text === 'DONE') data.cell.styles.fillColor = [146, 208, 80]; // Green [cite: 24, 60]
          else if (text.includes('NOT IN BOND')) data.cell.styles.fillColor = [255, 192, 0]; // Yellow 
          else if (text.includes('UNABLE')) data.cell.styles.fillColor = [255, 0, 0]; // Red [cite: 83]
        }

        // 2. Render Photos into Table
        if (data.column.index === 4 && rowData.before) {
          doc.addImage(rowData.before, 'JPEG', data.cell.x + 2, data.cell.y + 2, 16, 16);
        }
        if (data.column.index === 5 && rowData.after) {
          doc.addImage(rowData.after, 'JPEG', data.cell.x + 2, data.cell.y + 2, 16, 16);
        }
      }
    });

    if (mode === 'share') {
      const blob = doc.output('blob');
      const file = new File([blob], "Report.pdf", { type: 'application/pdf' });
      if (navigator.share) await navigator.share({ files: [file], title: 'Action Register' });
    } else {
      doc.save(`Action_Register_${projectInfo.villa}.pdf`);
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '15px', fontFamily: 'sans-serif', backgroundColor: '#f9f9f9' }}>
      <div style={{ background: '#fff', padding: '10px', borderRadius: '8px', marginBottom: '10px' }}>
        <input style={inputStyle} value={projectInfo.villa} onChange={e => setProjectInfo({...projectInfo, villa: e.target.value})} placeholder="Villa No" />
        <input style={inputStyle} value={projectInfo.title} onChange={e => setProjectInfo({...projectInfo, title: e.target.value})} placeholder="Report Title" />
      </div>

      {rows.map(row => (
        <div key={row.id} style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
            <span>Item {row.id}</span>
            <input type="text" placeholder="Remarks (DONE / PENDING)" value={row.remarks} onChange={e => updateRow(row.id, 'remarks', e.target.value)} style={{ border: '1px solid #ccc', padding: '2px' }} />
          </div>
          
          <textarea style={textStyle} placeholder="Date Logged & Description" value={row.dateDesc} onChange={e => updateRow(row.id, 'dateDesc', e.target.value)} />
          <input style={inputStyle} placeholder="Status / Logged By" value={row.statusBy} onChange={e => updateRow(row.id, 'statusBy', e.target.value)} />
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
            <label style={uploadBtn}> {row.before ? '✅ Before' : '📸 Before'} <input type="file" hidden onChange={e => handleImage(row.id, 'before', e.target.files[0])} /></label>
            <label style={uploadBtn}> {row.after ? '✅ After' : '📸 After'} <input type="file" hidden onChange={e => handleImage(row.id, 'after', e.target.files[0])} /></label>
          </div>
        </div>
      ))}

      <button onClick={addRow} style={addBtn}>+ ADD NEW ROW</button>
      
      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
        <button onClick={() => generatePDF('download')} style={pdfBtn}>{loading ? 'Generating...' : 'DOWNLOAD PDF'}</button>
        <button onClick={() => generatePDF('share')} style={waBtn}>WHATSAPP SHARE</button>
      </div>
    </div>
  );
}

// Styles to match professional look
const inputStyle = { width: '100%', padding: '10px', margin: '5px 0', borderRadius: '4px', border: '1px solid #ddd' };
const textStyle = { width: '100%', height: '50px', margin: '5px 0', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' };
const cardStyle = { background: '#fff', padding: '15px', borderRadius: '8px', marginBottom: '15px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' };
const uploadBtn = { background: '#eee', padding: '10px', textAlign: 'center', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' };
const addBtn = { width: '100%', padding: '12px', background: '#333', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold' };
const pdfBtn = { flex: 1, padding: '15px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold' };
const waBtn = { flex: 1, padding: '15px', background: '#25D366', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold' };
