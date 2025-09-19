// Contenido para: src/utils/csvHelper.ts

export const convertToCSV = (data: any[]): string => {
    if (!data || data.length === 0) {
        return '';
    }
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const row of data) {
        const values = headers.map(header => {
            let cellData = row[header];
            if (typeof cellData === 'object' && cellData !== null) {
                cellData = JSON.stringify(cellData);
            }
            const stringValue = String(cellData ?? '').replace(/"/g, '""');
            return `"${stringValue}"`;
        });
        csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
};

export const downloadCSV = (csvContent: string, fileName: string) => {
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) { 
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};