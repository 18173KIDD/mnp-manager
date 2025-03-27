/**
 * PDF出力サポート用ヘルパーモジュール
 * MNP契約情報管理表アプリケーション用
 * v5.0.0 - 日本語完全対応版
 */

// PDFヘルパーモジュール
const PDFHelper = (() => {
    
    /**
     * PDF生成前のプレビュー表示を行う関数
     * @param {HTMLElement} container - プレビュー表示用のHTML要素
     * @param {String} selectedGroupId - 選択中のグループID（未選択時は空文字）
     * @param {Function} getGroupFn - グループ情報取得用の関数
     */
    const showPreview = (container, selectedGroupId, getGroupFn) => {
        try {
            console.log('プレビュー表示処理開始');
            
            if (!container) {
                console.error('コンテナ要素が見つかりません');
                throw new Error('プレビュー表示用の要素が見つかりません');
            }
            
            // プレビューセクションを表示
            const previewSection = document.querySelector('.preview-section');
            if (previewSection) {
                previewSection.style.display = 'block';
            }
            
            // グループデータの取得
            let group = null;
            if (selectedGroupId && typeof getGroupFn === 'function') {
                group = getGroupFn(selectedGroupId);
                console.log('選択グループデータ取得:', group ? 'OK' : 'Not Found');
            }
            
            // プレビューの更新
            updatePreviewDisplay(container, group);
            
            return true;
        } catch (error) {
            console.error('プレビュー表示エラー:', error);
            alert('プレビュー表示中にエラーが発生しました: ' + error.message);
            return false;
        }
    };
    
    /**
     * プレビュー表示を更新する内部関数
     * @param {HTMLElement} container - プレビューコンテナ
     * @param {Object} group - グループデータ
     */
    const updatePreviewDisplay = (container, group) => {
        // ヘッダー部分の更新
        const previewHeader = container.querySelector('#preview-header');
        if (previewHeader) {
            let headerHTML = '';
            
            if (group) {
                // グループデータからヘッダー情報を生成
                const dateText = group.date ? new Date(group.date).toLocaleDateString('ja-JP') : '-';
                const customerInfo = `名前:${group.customerName || '-'} 年齢:${group.customerAge || '-'}`;
                
                let reservationText = '';
                if (group.reservationDate) {
                    reservationText = `予約希望日時:${new Date(group.reservationDate).toLocaleDateString('ja-JP')}`;
                    if (group.reservationTime) {
                        reservationText += ` ${group.reservationTime}頃`;
                    }
                } else {
                    reservationText = '予約希望日時:-';
                }
                
                headerHTML = `
                    <th>${dateText}</th>
                    <th colspan="3">${customerInfo}</th>
                    <th colspan="3">${reservationText}</th>
                `;
            } else {
                // 現在の入力データからヘッダー情報を取得
                const currentDateInput = document.getElementById('current-date');
                const customerNameInput = document.getElementById('customer-name');
                const customerAgeInput = document.getElementById('customer-age');
                const reservationDateInput = document.getElementById('reservation-date');
                const reservationTimeInput = document.getElementById('reservation-time');
                
                const date = currentDateInput?.value ? new Date(currentDateInput.value).toLocaleDateString('ja-JP') : '';
                const customerName = customerNameInput?.value || '';
                const customerAge = customerAgeInput?.value || '';
                const reservationDate = reservationDateInput?.value ? new Date(reservationDateInput.value).toLocaleDateString('ja-JP') : '';
                const reservationTime = reservationTimeInput?.value || '';
                
                const reservationDateTime = reservationDate && reservationTime ? `${reservationDate} ${reservationTime}頃` : '';
                
                headerHTML = `
                    <th>${date}</th>
                    <th colspan="3">名前:${customerName} 年齢:${customerAge}</th>
                    <th colspan="3">予約希望日時:${reservationDateTime}</th>
                `;
            }
            
            previewHeader.innerHTML = headerHTML;
        }
        
        // ボディ部分の更新
        const previewBody = container.querySelector('#preview-body');
        if (previewBody) {
            previewBody.innerHTML = '';
            
            if (group && group.lines && group.lines.length > 0) {
                // グループデータから行を生成
                group.lines.forEach((line, index) => {
                    const previewRow = document.createElement('tr');
                    const relationDisplay = line.relation === 'その他' ? `その他(${line.otherRelation || ''})` : line.relation || '';
                    
                    previewRow.innerHTML = `
                        <td>${line.phoneNumber || ''}</td>
                        <td>${line.mnpNumber || ''}</td>
                        <td>${line.carrier || ''}</td>
                        <td>${index + 1}${line.sourceName || ''}</td>
                        <td>${line.destName || ''}</td>
                        <td>${line.user || ''}</td>
                        <td>${relationDisplay}</td>
                    `;
                    
                    previewBody.appendChild(previewRow);
                });
            } else {
                // 現在の入力データから行を取得
                const lineTableBody = document.getElementById('line-table-body');
                if (lineTableBody) {
                    const rows = lineTableBody.querySelectorAll('tr');
                    
                    if (rows.length > 0) {
                        rows.forEach((row, index) => {
                            try {
                                const phoneNumber = row.querySelector('.phone-number')?.value || '';
                                const mnpNumber = row.querySelector('.mnp-number')?.value || '';
                                const carrier = row.querySelector('.carrier-select')?.value || '';
                                const sourceName = row.querySelector('.source-name')?.value || '';
                                const destName = row.querySelector('.dest-name')?.value || '';
                                const userName = row.querySelector('.user-name')?.value || '';
                                const relationSelect = row.querySelector('.relation');
                                const relation = relationSelect?.value || '';
                                let otherRelation = '';
                                
                                // その他が選択されている場合はテキスト入力値を取得
                                if (relation === 'その他') {
                                    otherRelation = row.querySelector('.other-relation')?.value || '';
                                }
                                
                                // 乗り換え元の名義に番号を付ける
                                const numberedSourceName = sourceName ? `${index + 1}${sourceName}` : '';
                                
                                const previewRow = document.createElement('tr');
                                // 関係の表示テキストを生成
                                let relationDisplay = relation;
                                if (relation === 'その他' && otherRelation) {
                                    relationDisplay = `その他(${otherRelation})`;
                                }
                                
                                previewRow.innerHTML = `
                                    <td>${phoneNumber}</td>
                                    <td>${mnpNumber}</td>
                                    <td>${carrier}</td>
                                    <td>${numberedSourceName}</td>
                                    <td>${destName}</td>
                                    <td>${userName}</td>
                                    <td>${relationDisplay}</td>
                                `;
                                
                                previewBody.appendChild(previewRow);
                            } catch (error) {
                                console.error('行のプレビュー生成中にエラーが発生しました:', error, row);
                            }
                        });
                    }
                }
            }
        }
        
        // 列幅の最適化
        optimizeColumnWidths();
    };
    
    /**
     * 列幅の最適化設定
     */
    const optimizeColumnWidths = () => {
        const previewTable = document.getElementById('preview-table');
        if (!previewTable) return;
        
        // テーブル自体の幅を設定 - 最大幅に調整
        previewTable.style.width = '100%';
        previewTable.style.maxWidth = '100%';
        
        // 各セルの表示を最適化するスタイルを追加
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            @media print {
                #preview-table { width: 100% !important; table-layout: fixed !important; }
                #preview-table th, #preview-table td { 
                    overflow: visible !important; 
                    text-overflow: clip !important;
                    white-space: normal !important;
                    word-wrap: break-word !important;
                    max-width: none !important;
                }
                /* 空白ページ抑制 */
                body { height: auto !important; }
                html { height: auto !important; }
                .preview-section { page-break-after: avoid !important; }
                * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                @page { size: landscape; margin: 5mm; }
                /* これ以降を印刷しないように */
                #preview-container::after { display: none !important; }
                @page :blank { display: none; }
            }
        `;
        document.head.appendChild(styleElement);
        
        // 列幅をバランス良く設定する
        const columnWidths = [
            '15%',  // 電話番号
            '17%',  // MNP予約番号
            '12%',  // 移転元キャリア
            '15%',  // 乗り換え元名義
            '15%',  // 乗り換え先名義
            '12%',  // 利用者
            '14%'   // 関係
        ];
        
        try {
            // theadの最後の行の列数を取得
            const headerRow = previewTable.querySelector('thead tr:last-child');
            if (!headerRow) return;
            
            const cells = headerRow.querySelectorAll('th');
            if (cells.length !== columnWidths.length) return;
            
            // 各列の幅を設定
            cells.forEach((cell, index) => {
                if (index < columnWidths.length) {
                    cell.style.width = columnWidths[index];
                    cell.style.maxWidth = 'none';
                    cell.style.overflow = 'visible';
                    cell.style.whiteSpace = 'normal';
                    cell.style.wordWrap = 'break-word';
                }
            });
            
            // プレビューコンテナのクリーンアップ
            const previewSection = document.querySelector('.preview-section');
            if (previewSection) {
                previewSection.style.height = 'auto';
                previewSection.style.pageBreakAfter = 'avoid';
                previewSection.style.pageBreakBefore = 'avoid';
                previewSection.style.pageBreakInside = 'avoid';
                
                // 空白ページ無効化の追加処理
                const printFix = previewSection.querySelector('.print-fix');
                if (printFix) {
                    printFix.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('列幅最適化エラー:', error);
        }
    };
    
    /**
     * PDF出力を実行する関数（html2canvasを使用したキャプチャ方式）
     * @param {HTMLElement} container - プレビュー表示用のHTML要素
     * @param {String} selectedGroupId - 選択中のグループID（未選択時は空文字）
     * @param {Function} getGroupFn - グループ情報取得用の関数
     * @returns {Promise} PDF生成結果のPromise
     */
    const generatePDF = async (container, selectedGroupId, getGroupFn) => {
        try {
            console.log('PDF生成処理開始 - HTML2Canvas方式');
            
            // jsPDFライブラリの参照を確認
            let jsPDFClass = null;
            if (window.jspdf && window.jspdf.jsPDF) {
                console.log('jsPDFライブラリを見つけました: window.jspdf.jsPDF');
                jsPDFClass = window.jspdf.jsPDF;
            } else if (window.jsPDF) {
                console.log('jsPDFライブラリを見つけました: window.jsPDF');
                jsPDFClass = window.jsPDF;
            } else {
                console.error('jsPDFライブラリが見つかりません');
                throw new Error('PDF生成用のライブラリが読み込まれていません');
            }
            
            // 現在の表示を最適化（PDFキャプチャ用）
            optimizePreviewForCapture(container);
            
            // プレビューコンテナのクローンを作成（スタイルを維持したままで）
            const clonedContainer = container.cloneNode(true);
            
            // 隠しコンテナを作成
            const hiddenContainer = document.createElement('div');
            hiddenContainer.id = 'pdf-capture-container';
            hiddenContainer.style.position = 'absolute';
            hiddenContainer.style.left = '-9999px';
            hiddenContainer.style.top = '0';
            hiddenContainer.style.width = '800px'; // 固定幅
            hiddenContainer.style.height = 'auto';
            hiddenContainer.style.zIndex = '-1000';
            hiddenContainer.style.overflow = 'visible';
            
            // スタイルを埋め込み
            hiddenContainer.innerHTML = `
                <style>
                    #pdf-preview-table {
                        width: 100%;
                        max-width: 100%;
                        table-layout: fixed;
                        border-collapse: collapse;
                        margin: 0;
                        padding: 0;
                    }
                    #pdf-preview-table th,
                    #pdf-preview-table td {
                        border: 1px solid #000;
                        padding: 8px;
                        text-align: left;
                        word-wrap: break-word;
                        overflow: visible;
                        font-family: 'MS Gothic', 'Hiragino Kaku Gothic ProN', sans-serif;
                    }
                    #pdf-preview-table thead th {
                        background-color: #3498db;
                        color: white;
                        font-weight: bold;
                    }
                    #pdf-preview-table tr:nth-child(even) {
                        background-color: #f2f2f2;
                    }
                    #pdf-preview-table tr:hover {
                        background-color: #f5f5f5;
                    }
                    .pdf-title {
                        text-align: center;
                        font-size: 18px;
                        font-weight: bold;
                        margin-bottom: 10px;
                        font-family: 'MS Gothic', 'Hiragino Kaku Gothic ProN', sans-serif;
                    }
                    .pdf-info {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 10px;
                        font-family: 'MS Gothic', 'Hiragino Kaku Gothic ProN', sans-serif;
                    }
                </style>
            `;
            
            // テーブルデータの取得
            const { headerInfo, rowsData, group } = getPdfData(container, selectedGroupId, getGroupFn);
            
            // タイトル要素
            const titleDiv = document.createElement('div');
            titleDiv.className = 'pdf-title';
            titleDiv.textContent = 'MNP契約情報管理表';
            hiddenContainer.appendChild(titleDiv);
            
            // 情報要素
            const infoDiv = document.createElement('div');
            infoDiv.className = 'pdf-info';
            
            // 日付情報
            const dateInfo = document.createElement('div');
            dateInfo.textContent = `日付: ${headerInfo.date}`;
            infoDiv.appendChild(dateInfo);
            
            // 顧客情報
            const customerInfo = document.createElement('div');
            customerInfo.textContent = `名前: ${headerInfo.customerName}  年齢: ${headerInfo.customerAge}`;
            infoDiv.appendChild(customerInfo);
            
            // 予約情報
            const reservationInfo = document.createElement('div');
            let reservationText = '';
            if (headerInfo.reservationDate !== '-') {
                reservationText = `予約希望日時: ${headerInfo.reservationDate}`;
                if (headerInfo.reservationTime) {
                    reservationText += ` ${headerInfo.reservationTime}`;
                }
            }
            reservationInfo.textContent = reservationText;
            infoDiv.appendChild(reservationInfo);
            
            hiddenContainer.appendChild(infoDiv);
            
            // テーブル作成
            const table = document.createElement('table');
            table.id = 'pdf-preview-table';
            
            // テーブルヘッダー
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            
            const headers = [
                '電話番号', 'MNP予約番号', '移転元キャリア', '乗り換え元名義', 
                '乗り換え先名義', '利用者', '関係'
            ];
            
            headers.forEach(header => {
                const th = document.createElement('th');
                th.textContent = header;
                headerRow.appendChild(th);
            });
            
            thead.appendChild(headerRow);
            table.appendChild(thead);
            
            // テーブルボディ
            const tbody = document.createElement('tbody');
            
            rowsData.forEach(row => {
                const tr = document.createElement('tr');
                
                const cellData = [
                    row.phoneNumber,
                    row.mnpNumber,
                    row.carrier,
                    row.sourceName,
                    row.destName,
                    row.user,
                    row.relation
                ];
                
                cellData.forEach(data => {
                    const td = document.createElement('td');
                    td.textContent = data;
                    tr.appendChild(td);
                });
                
                tbody.appendChild(tr);
            });
            
            table.appendChild(tbody);
            hiddenContainer.appendChild(table);
            
            // ドキュメントに隠しコンテナを追加
            document.body.appendChild(hiddenContainer);
            
            // HTML要素を画像としてキャプチャ
            try {
                // PDFドキュメント作成
                const doc = new jsPDFClass({
                    orientation: 'landscape',
                    unit: 'mm',
                    format: 'a4'
                });
                
                const pdfWidth = doc.internal.pageSize.getWidth();
                const pdfHeight = doc.internal.pageSize.getHeight();
                
                console.log('HTML2Canvasで変換中...');
                
                // キャプチャサイズの調整
                const scaleFactor = 2; // 高解像度化するためのスケール
                
                // html2canvasでキャプチャ
                const canvas = await html2canvas(hiddenContainer, {
                    scale: scaleFactor,
                    logging: false,
                    allowTaint: true,
                    useCORS: true,
                    backgroundColor: '#ffffff'
                });
                
                // 画像をPDFに埋め込む
                const imgData = canvas.toDataURL('image/png');
                
                // マージン計算
                const margin = 10; // mm
                const availableWidth = pdfWidth - (margin * 2);
                const availableHeight = pdfHeight - (margin * 2);
                
                // 画像サイズ計算（縦横比を維持）
                const imgWidth = availableWidth;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                
                // 画像をセンタリングして配置
                const imgX = margin;
                const imgY = margin;
                
                // PDFに画像を追加
                doc.addImage(imgData, 'PNG', imgX, imgY, imgWidth, imgHeight);
                
                // フッター情報を追加
                doc.setFontSize(8);
                const now = new Date();
                const footerText = `出力日時: ${now.toLocaleString('ja-JP')}`;
                doc.text(footerText, pdfWidth - margin, pdfHeight - 5);
                
                // ファイル名生成
                const timestamp = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
                
                let fileName;
                if (group) {
                    fileName = `MNP契約情報_${group.groupName || group.customerName || 'グループ'}_${timestamp}.pdf`;
                } else {
                    fileName = `MNP契約情報_全体_${timestamp}.pdf`;
                }
                
                // PDF保存
                console.log('PDF保存:', fileName);
                doc.save(fileName);
                
                // キャプチャ用の隠しコンテナを削除
                document.body.removeChild(hiddenContainer);
                
                console.log('PDF生成完了');
                return true;
                
            } catch (err) {
                console.error('HTML変換エラー:', err);
                
                // クリーンアップ
                if (document.body.contains(hiddenContainer)) {
                    document.body.removeChild(hiddenContainer);
                }
                
                throw new Error('HTML変換エラー: ' + err.message);
            }
            
        } catch (error) {
            console.error('PDF出力処理エラー:', error);
            alert('PDF生成中にエラーが発生しました: ' + error.message);
            throw error;
        }
    };
    
    /**
     * キャプチャ用にプレビューを最適化
     * @param {HTMLElement} container - プレビューコンテナ 
     */
    const optimizePreviewForCapture = (container) => {
        const previewTable = container.querySelector('#preview-table');
        if (!previewTable) return;
        
        // テーブルスタイルの最適化
        previewTable.style.width = '100%';
        previewTable.style.maxWidth = '800px';
        previewTable.style.tableLayout = 'fixed';
        previewTable.style.borderCollapse = 'collapse';
        
        // ヘッダーの背景色を設定
        const headers = previewTable.querySelectorAll('th');
        headers.forEach(header => {
            header.style.backgroundColor = '#3498db';
            header.style.color = 'white';
            header.style.border = '1px solid #2980b9';
            header.style.padding = '8px';
            header.style.fontWeight = 'bold';
        });
        
        // セルのスタイル最適化
        const cells = previewTable.querySelectorAll('td');
        cells.forEach(cell => {
            cell.style.border = '1px solid #ddd';
            cell.style.padding = '8px';
            cell.style.wordWrap = 'break-word';
            cell.style.overflow = 'visible';
            cell.style.whiteSpace = 'normal';
        });
        
        // 偶数行の背景色
        const rows = previewTable.querySelectorAll('tbody tr');
        rows.forEach((row, index) => {
            if (index % 2 === 1) {
                row.style.backgroundColor = '#f2f2f2';
            }
        });
    };
    
    /**
     * PDF生成のためにテーブルデータを取得する内部関数
     * @param {HTMLElement} container - プレビュー表示用のHTML要素
     * @param {String} selectedGroupId - 選択中のグループID（未選択時は空文字）
     * @param {Function} getGroupFn - グループ情報取得用の関数
     * @returns {Object} 生成に必要なデータ
     */
    const getPdfData = (container, selectedGroupId, getGroupFn) => {
        // グループデータの取得
        let group = null;
        if (selectedGroupId && typeof getGroupFn === 'function') {
            group = getGroupFn(selectedGroupId);
        }
        
        // ヘッダー情報の取得
        let headerInfo = {};
        
        if (group) {
            // グループデータからヘッダー情報を生成
            headerInfo = {
                date: group.date ? new Date(group.date).toLocaleDateString('ja-JP') : '-',
                customerName: group.customerName || '-',
                customerAge: group.customerAge || '-',
                reservationDate: group.reservationDate ? new Date(group.reservationDate).toLocaleDateString('ja-JP') : '-',
                reservationTime: group.reservationTime || ''
            };
        } else {
            // 現在の入力データからヘッダー情報を取得
            const currentDateInput = document.getElementById('current-date');
            const customerNameInput = document.getElementById('customer-name');
            const customerAgeInput = document.getElementById('customer-age');
            const reservationDateInput = document.getElementById('reservation-date');
            const reservationTimeInput = document.getElementById('reservation-time');
            
            headerInfo = {
                date: currentDateInput?.value ? new Date(currentDateInput.value).toLocaleDateString('ja-JP') : '',
                customerName: customerNameInput?.value || '',
                customerAge: customerAgeInput?.value || '',
                reservationDate: reservationDateInput?.value ? new Date(reservationDateInput.value).toLocaleDateString('ja-JP') : '',
                reservationTime: reservationTimeInput?.value || ''
            };
        }
        
        // 行データの取得
        let rowsData = [];
        
        if (group && group.lines && group.lines.length > 0) {
            // グループデータから行を生成
            rowsData = group.lines.map((line, index) => {
                const relationDisplay = line.relation === 'その他' ? `その他(${line.otherRelation || ''})` : line.relation || '';
                return {
                    phoneNumber: line.phoneNumber || '',
                    mnpNumber: line.mnpNumber || '',
                    carrier: line.carrier || '',
                    sourceName: `${index + 1}${line.sourceName || ''}`,
                    destName: line.destName || '',
                    user: line.user || '',
                    relation: relationDisplay
                };
            });
        } else {
            // プレビューから行データを取得
            const previewBody = container.querySelector('#preview-body');
            if (previewBody) {
                const rows = previewBody.querySelectorAll('tr');
                rowsData = Array.from(rows).map(row => {
                    const cells = row.querySelectorAll('td');
                    return {
                        phoneNumber: cells[0]?.textContent || '',
                        mnpNumber: cells[1]?.textContent || '',
                        carrier: cells[2]?.textContent || '',
                        sourceName: cells[3]?.textContent || '',
                        destName: cells[4]?.textContent || '',
                        user: cells[5]?.textContent || '',
                        relation: cells[6]?.textContent || ''
                    };
                });
            }
        }
        
        return {
            headerInfo,
            rowsData,
            group
        };
    };
    
    /**
     * CSV出力を実行する関数
     * @param {String} selectedGroupId - 選択中のグループID（未選択時は空文字）
     * @param {Function} getGroupFn - グループ情報取得用の関数
     * @param {Function} getGroupsFn - 全グループ情報取得用の関数
     */
    const generateCSV = (selectedGroupId, getGroupFn, getGroupsFn) => {
        try {
            console.log('CSV出力処理開始');
            
            // TextEncoderの存在確認
            if (!window.TextEncoder) {
                console.error('TextEncoderが見つかりません');
                throw new Error('CSV出力に必要なエンコーディング機能が利用できません');
            }
            
            let dataToExport = [];
            
            // 選択グループがある場合はそのグループのみ出力
            if (selectedGroupId && typeof getGroupFn === 'function') {
                const group = getGroupFn(selectedGroupId);
                console.log('選択グループデータ取得:', group ? 'OK' : 'Not Found');
                
                if (group && group.lines && group.lines.length > 0) {
                    dataToExport = createExportData(group);
                }
            } 
            // 選択グループがない場合は全グループを出力
            else if (typeof getGroupsFn === 'function') {
                const groups = getGroupsFn();
                console.log('全グループデータ取得:', groups?.length || 0, '件');
                
                if (groups && groups.length > 0) {
                    groups.forEach(group => {
                        if (group && group.lines && group.lines.length > 0) {
                            const groupData = createExportData(group);
                            dataToExport = [...dataToExport, ...groupData];
                        }
                    });
                }
            }
            
            if (dataToExport.length === 0) {
                console.log('出力するデータがありません');
                throw new Error('出力するデータがありません');
            }
            
            console.log('CSV出力データ作成:', dataToExport.length, '行');
            
            // CSVデータの作成
            const headers = Object.keys(dataToExport[0]);
            const rows = [
                headers.join(','),
                ...dataToExport.map(row => headers.map(header => {
                    const cell = row[header] || '';
                    return `"${cell.toString().replace(/"/g, '""')}"`;
                }).join(','))
            ];
            
            // CSVコンテンツ生成
            const csvContent = rows.join('\n');
            
            // UTF-8で出力するように変更
            console.log('エンコーディング処理開始');
            
            // UTF-8 BOMを作成
            const bomBuffer = new Uint8Array([0xEF, 0xBB, 0xBF]);
            
            // CSVデータをUTF-8でエンコード
            const textEncoder = new TextEncoder();
            const csvContentUtf8 = textEncoder.encode(csvContent);
            
            // BOMとCSV内容を結合
            const combinedArray = new Uint8Array(bomBuffer.length + csvContentUtf8.length);
            combinedArray.set(bomBuffer);
            combinedArray.set(csvContentUtf8, bomBuffer.length);
            
            // UTF-8エンコードでBlobを作成
            const blob = new Blob([combinedArray], {
                type: 'text/csv;charset=utf-8'
            });
            
            console.log('CSVデータエンコード完了');
            
            // ファイル名生成
            const now = new Date();
            const timestamp = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
            
            let fileName;
            if (selectedGroupId && typeof getGroupFn === 'function') {
                const selectedGroup = getGroupFn(selectedGroupId);
                fileName = selectedGroup ?
                    `MNP契約情報_${selectedGroup.groupName || selectedGroup.customerName || 'グループ'}_${timestamp}.csv` :
                    `MNP契約情報_${timestamp}.csv`;
            } else {
                fileName = `MNP契約情報_全体_${timestamp}.csv`;
            }
            
            // ダウンロード実行
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = fileName;
            link.click();
            URL.revokeObjectURL(link.href);
            
            console.log('CSV出力完了:', fileName);
            return true;
        } catch (error) {
            console.error('CSV出力処理エラー:', error);
            throw error;
        }
    };
    
    /**
     * 出力データを作成する内部関数
     * @param {Object} group - グループデータ
     * @returns {Array} 出力データの配列
     */
    const createExportData = (group) => {
        return group.lines.map((line, index) => {
            let groupDate, reservationDate;
            
            try {
                groupDate = group.date ? new Date(group.date).toLocaleDateString() : '';
            } catch (e) {
                console.error('日付変換エラー:', e);
                groupDate = '';
            }
            
            try {
                reservationDate = group.reservationDate ? new Date(group.reservationDate).toLocaleDateString() : '';
            } catch (e) {
                console.error('予約日付変換エラー:', e);
                reservationDate = '';
            }
            
            return {
                'グループ名': group.groupName || '',
                '日付': groupDate,
                '顧客名': group.customerName || '',
                '年齢': group.customerAge || '',
                '予約希望日': reservationDate,
                '予約希望時間': group.reservationTime || '',
                '電話番号': line.phoneNumber || '',
                'MNP予約番号': line.mnpNumber || '',
                '移転元キャリア': line.carrier || '',
                '乗り換え元名義': `${index + 1}${line.sourceName || ''}`,
                '乗り換え先名義': line.destName || '',
                '利用者': line.user || '',
                '関係': line.relation === 'その他' ? `その他(${line.otherRelation || ''})` : line.relation || ''
            };
        });
    };
    
    // 公開API
    return {
        showPreview,
        generatePDF,
        generateCSV
    };
})();