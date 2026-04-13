import React, { useState, useEffect, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ActionRegisterApp() {
  // Main State for Table Rows
  const [rows, setRows] = useState(() => {
    const saved = localStorage.getItem('actionRows');
    return saved ? JSON.parse(saved) : [{ id: 1, date: '', desc: '', status: '', before: null, after: null }];
  });

  const [projectInfo, setProjectInfo] = useState(() => {
    const saved = localStorage.getItem('projectInfo');
    return saved ? JSON.parse(saved) : { name: '', villa: '' };
  });

  const [loading, setLoading] = useState(false);

  // LocalStorage Sync using useEffect
  useEffect(() => {
    localStorage.setItem('actionRows', JSON.stringify(rows));
    localStorage.setItem('projectInfo', JSON.stringify(projectInfo));
  }, [rows, projectInfo]);

  // Add New Row
  const addRow = () => {
    const newId = rows.length > 0 ? rows[rows.length - 1].id + 1 : 1;
    setRows([...rows, { id: newId, date: '', desc: '', status: '', before: null, after: null }]);
  };

  // Handle Input Changes
  const handleInputChange = (id, field, value) => {
    setRows(rows.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  // Image Upload Logic (Unlimited Before/After)
  const handleImageUpload = (id, type, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setRows(rows.map(row => row.id === id ? { ...row, [type]: reader.result } : row));
    };
    reader.readAsDataURL(file);
  };

  const clearAll = () => {
    if (window.confirm("Ella data-vum delete aagidum. Sure-ah?")) {
      setRows([{ id: 1, date: '', desc: '', status: '', before: null, after: null }]);
      setProjectInfo({ name: '', villa: '' });
      localStorage.clear();
    }
  };

  // PDF Generation Logic (Exact Replica of Sharook 1 format)
  const generatePDF = async (type) => {
    setLoading(true);
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape for Table
    
    doc.setFontSize(16);
    doc.text(`${projectInfo.name || 'FLORA'} - ACTION REGISTER`, 14, 15);

    const tableBody = rows.map(r => [
      r.id,
      `${r.date}\n${r.desc}`,
      r.status,
      '', // Actual Closed Date (placeholder)
      '', // Photo Before (handled in didDrawCell)
      '', // Photo After (handled in didDrawCell)
      '', // Owner
      '', // Closed By
      r.status.toUpperCase()
    ]);

    autoTable(doc, {
      startY: 25,
      head: [['S.No', 'Date & Description', 'Current Status', 'Closed Date', 'Photos Before', 'Photos After', 'Owner', 'By', 'Remarks']],
      body: tableBody,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, minCellHeight: 25 },
      headStyles: { fillColor: [40, 40, 40] },
      didDrawCell: (data) => {
        // Color Coding Logic
        if (data.column.index === 8 || data.column.index === 2) {
          const val = data.cell.raw;
          if (val === 'Done') data.cell.styles.fillColor = [146, 208, 80]; // Green
          if (val === 'Pending' || val?.includes('Unable')) data.cell.styles.fillColor = [255, 0, 0]; // Red
        }

        // Render Images in Table
        const rowIndex = data.row.index;
        if (data.column.index === 4 && rows[rowIndex].before) {
          doc.addImage(rows[rowIndex].before, 'JPEG', data.cell.x + 2, data.cell.y + 2, 20, 20);
        }
        if (data.column.index === 5 && rows[rowIndex].after) {
          doc.addImage(rows[rowIndex].after, 'JPEG', data.cell.x + 2, data.cell.y + 2, 20, 20);
        }
      }
    });

    const blob = doc.output('blob');
    const fileName = `${projectInfo.name || 'Report'}.pdf`;

    if (type === 'download') {
      doc.save(fileName);
    } else {
      const file = new File([blob], fileName, { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Action Register Report' });
      } else {
        alert("WhatsApp share not supported in this browser. Use Download.");
      }
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>ACTION REGISTER BUILDER</h2>
      
      <div style={styles.headerInputs}>
        <input placeholder="Project Name" value={projectInfo.name} onChange={e => setProjectInfo({...projectInfo, name: e.target.value})} style={styles.mainInput} />
        <input placeholder="Villa No" value={projectInfo.villa} onChange={e => setProjectInfo({...projectInfo, villa: e.target.value})} style={styles.mainInput} />
      </div>

      <div style={styles.tableContainer}>
        {rows.map((row) => (
          <div key={row.id} style={{...styles.rowCard, borderLeft: row.status === 'Done' ? '8px solid #92d050' : row.status === 'Pending' ? '8px solid red' : '8px solid #ccc'}}>
            <div style={styles.rowHeader}>
              <span>Item #{row.id}</span>
              <input type="date" value={row.date} onChange={e => handleInputChange(row.id, 'date', e.target.value)} style={styles.smallInput} />
            </div>
            
            <textarea placeholder="Description" value={row.desc} onChange={e => handleInputChange(row.id, 'desc', e.target.value)} style={styles.textarea} />
            
            <select value={row.status} onChange={e => handleInputChange(row.id, 'status', e.target.value)} style={styles.select}>
              <option value="">Select Status</option>
              <option value="Done">Done</option>
              <option value="Pending">Pending</option>
              <option value="Unable to Work">Unable to Work</option>
              <option value="Not in Bond Scope">Not in Bond Scope</option>
            </select>

            <div style={styles.imageGrid}>
              <label style={styles.imageLabel}>
                {row.before ? '✅ Before' : '📸 Before Photo'}
                <input type="file" hidden onChange={e => handleImageUpload(row.id, 'before', e.target.files[0])} />
              </label>
              <label style={styles.imageLabel}>
                {row.after ? '✅ After' : '📸 After Photo'}
                <input type="file" hidden onChange={e => handleImageUpload(row.id, 'after', e.target.files[0])} />
              </label>
            </div>
          </div>
        ))}
      </div>

      <button onClick={addRow} style={styles.addBtn}>+ ADD NEW ACTION ITEM</button>

      <div style={styles.footer}>
        <button onClick={() => generatePDF('download')} style={styles.downloadBtn}>{loading ? '...' : 'DOWNLOAD PDF'}</button>
        <button onClick={() => generatePDF('share')} style={styles.shareBtn}>SHARE TO WHATSAPP</button>
        <button onClick={clearAll} style={styles.clearBtn}>RESET</button>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '15px', maxWidth: '600px', margin: '0 auto', fontFamily: 'Arial', backgroundColor: '#f4f4f4' },
  title: { textAlign: 'center', color: '#333' },
  headerInputs: { display: 'flex', gap: '10px', marginBottom: '15px' },
  mainInput: { flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #ddd' },
  tableContainer: { display: 'flex', flexDirection: 'column', gap: '15px' },
  rowCard: { backgroundColor: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  rowHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px' },
  smallInput: { padding: '5px' },
  textarea: { width: '100%', height: '60px', marginBottom: '10px', padding: '8px', boxSizing: 'border-box' },
  select: { width: '100%', padding: '10px', marginBottom: '10px' },
  imageGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
  imageLabel: { backgroundColor: '#e9ecef', padding: '10px', textAlign: 'center', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' },
  addBtn: { width: '100%', padding: '15px', marginTop: '15px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '5px', fontWeight: 'bold' },
  footer: { marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' },
  downloadBtn: { padding: '15px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '5px', fontWeight: 'bold' },
  shareBtn: { padding: '15px', backgroundColor: '#25D366', color: '#fff', border: 'none', borderRadius: '5px', fontWeight: 'bold' },
  clearBtn: { color: '#666', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer' }
};
