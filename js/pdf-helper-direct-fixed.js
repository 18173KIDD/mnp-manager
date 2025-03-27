/**
 * PDF出力サポート用ヘルパーモジュール
 * MNP契約情報管理表アプリケーション用
 * v3.2.0 - 直接描画方式（改良版）
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
     * PDF出力を実行する関数
     * @param {HTMLElement} container - プレビュー表示用のHTML要素
     * @param {String} selectedGroupId - 選択中のグループID（未選択時は空文字）
     * @param {Function} getGroupFn - グループ情報取得用の関数
     */
    const generatePDF = async (container, selectedGroupId, getGroupFn) => {
        try {
            console.log('PDF生成処理開始 - 直接描画方式');
            
            if (!container) {
                console.error('コンテナ要素が見つかりません');
                throw new Error('プレビュー表示用の要素が見つかりません');
            }
            
            // jsPDFライブラリの参照を確認（修正：複数の参照パターンに対応）
            let jsPDFClass = null;
            
            if (window.jspdf && window.jspdf.jsPDF) {
                console.log('jsPDFライブラリを見つけました: window.jspdf.jsPDF');
                jsPDFClass = window.jspdf.jsPDF;
            } else if (window.jsPDF) {
                console.log('jsPDFライブラリを見つけました: window.jsPDF');
                jsPDFClass = window.jsPDF;
            } else {
                console.error('jsPDFライブラリが見つかりません');
                throw new Error('PDF生成用のライブラリが読み込まれていません。ページを再読み込みして再試行してください。');
            }
            
            // PDFドキュメント作成（横向き、A4サイズ）
            const doc = new jsPDFClass({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4',
                compress: true
            });
            
            // 日本語フォントの対応
            // Note: ここではデフォルトフォントを使用（ヘッダー・フッターなど日本語以外のテキスト用）
            // 日本語部分は画像として埋め込む
            
            // PDFのサイズ情報取得
            const pdfWidth = doc.internal.pageSize.getWidth();
            const pdfHeight = doc.internal.pageSize.getHeight();
            console.log('PDF サイズ:', pdfWidth, 'x', pdfHeight, 'mm');
            
            // タイトル
            doc.setFontSize(16);
            doc.text('MNP契約情報管理表', pdfWidth / 2, 10, { align: 'center' });
            
            // プレビュー表示を画像としてキャプチャ
            // HTML要素を画像としてキャプチャ
            try {
                // html2canvasがあるか確認
                if (!window.html2canvas) {
                    throw new Error('html2canvasライブラリが見つかりません');
                }
                
                // プレビューテーブルを取得
                const previewTable = container.querySelector('#preview-table');
                if (!previewTable) {
                    throw new Error('プレビューテーブルが見つかりません');
                }
                
                // 表示状態を確保
                const isVisible = previewTable.style.display !== 'none';
                if (!isVisible) {
                    previewTable.style.display = 'table';
                }
                
                console.log('HTML表をキャプチャ中...');
                
                // html2canvasによる描画
                const canvas = await html2canvas(previewTable, {
                    scale: 2, // 高解像度で描画
                    useCORS: true,
                    logging: false,
                    letterRendering: true,
                    allowTaint: true
                });
                
                // 元の表示状態に戻す
                if (!isVisible) {
                    previewTable.style.display = 'none';
                }
                
                // 画像をPDFに埋め込む（位置調整）
                const imgData = canvas.toDataURL('image/png');
                const imgWidth = pdfWidth - 20;  // 左右マージン
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                
                // 画像をPDFに追加（位置を微調整）
                doc.addImage(imgData, 'PNG', 10, 20, imgWidth, imgHeight);
                
                // フッター情報追加
                doc.setFontSize(8);
                const now = new Date();
                const footerText = `出力日時: ${now.toLocaleString('ja-JP')}`;
                doc.text(footerText, pdfWidth - 10, pdfHeight - 5, { align: 'right' });
                
                // ファイル名生成（日付スタンプ付き）
                const timestamp = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
                
                // 選択グループに基づくファイル名設定
                let fileName;
                let group = null;
                
                if (selectedGroupId && typeof getGroupFn === 'function') {
                    group = getGroupFn(selectedGroupId);
                }
                
                if (group) {
                    fileName = `MNP契約情報_${group.groupName || group.customerName || 'グループ'}_${timestamp}.pdf`;
                } else {
                    fileName = `MNP契約情報_全体_${timestamp}.pdf`;
                }
                
                // PDF保存
                console.log('PDF保存:', fileName);
                doc.save(fileName);
                console.log('PDF生成完了');
                
                return true;
            } catch (err) {
                console.error('HTML2Canvas処理エラー:', err);
                
                // フォールバック：テキストのみのPDF生成
                alert('画像変換に失敗しました。テキストのみのPDFを生成します。');
                return generateTextOnlyPDF(container, selectedGroupId, getGroupFn);
            }
        } catch (error) {
            console.error('PDF出力処理エラー:', error);
            alert('PDF生成中にエラーが発生しました: ' + error.message);
            throw error;
        }
    };
    
    /**
     * テキストのみのPDF出力を実行する関数（フォールバック）
     * @param {HTMLElement} container - プレビュー表示用のHTML要素
     * @param {String} selectedGroupId - 選択中のグループID（未選択時は空文字）
     * @param {Function} getGroupFn - グループ情報取得用の関数
     */
    const generateTextOnlyPDF = (container, selectedGroupId, getGroupFn) => {
        try {
            console.log('テキストのみのPDF生成処理開始');
            
            // jsPDFライブラリの参照を確認
            let jsPDFClass = null;
            
            if (window.jspdf && window.jspdf.jsPDF) {
                jsPDFClass = window.jspdf.jsPDF;
            } else if (window.jsPDF) {
                jsPDFClass = window.jsPDF;
            } else {
                throw new Error('PDF生成用のライブラリが見つかりません');
            }
            
            // PDFドキュメント作成（横向き、A4サイズ）
            const doc = new jsPDFClass({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });
            
            // PDFのサイズ情報取得
            const pdfWidth = doc.internal.pageSize.getWidth();
            const pdfHeight = doc.internal.pageSize.getHeight();
            
            // マージン設定
            const margin = 10;
            const contentWidth = pdfWidth - (margin * 2);
            const startX = margin;
            let currentY = margin;
            
            // フォント設定
            doc.setFont('helvetica', 'normal');
            
            // グループデータの取得
            let group = null;
            if (selectedGroupId && typeof getGroupFn === 'function') {
                group = getGroupFn(selectedGroupId);
            }
            
            // 現在の入力データを取得
            const previewHeader = container.querySelector('#preview-header');
            const previewBody = container.querySelector('#preview-body');
            
            if (!previewHeader || !previewBody) {
                throw new Error('プレビューのヘッダーまたは本文が見つかりません');
            }
            
            // ヘッダー情報を取得（テキストのみ）
            const headerText = previewHeader.textContent.trim().replace(/\s+/g, ' ');
            
            // ヘッダーをPDFに描画
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            
            // タイトル
            doc.setFontSize(16);
            doc.text('MNP契約情報管理表', pdfWidth / 2, currentY, { align: 'center' });
            currentY += 10;
            
            // ヘッダー情報
            doc.setFontSize(12);
            doc.text(headerText, startX, currentY);
            currentY += 10;
            
            // テーブルヘッダー
            const tableHeaders = [
                '電話番号', 'MNP予約番号', '移転元キャリア', '乗り換え元名義', '乗り換え先名義', '利用者', '関係'
            ];
            
            // 列幅の設定 (合計で100%になるよう調整)
            const colWidths = [
                contentWidth * 0.15, // 電話番号
                contentWidth * 0.17, // MNP予約番号
                contentWidth * 0.10, // 移転元キャリア
                contentWidth * 0.17, // 乗り換え元名義
                contentWidth * 0.17, // 乗り換え先名義
                contentWidth * 0.12, // 利用者
                contentWidth * 0.12  // 関係
            ];
            
            // テーブルヘッダーの背景色
            doc.setFillColor(220, 220, 220);
            doc.rect(startX, currentY, contentWidth, 8, 'F');
            
            // ヘッダーテキスト
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            
            let colX = startX;
            tableHeaders.forEach((header, index) => {
                doc.text(header, colX + 2, currentY + 5);
                colX += colWidths[index];
            });
            
            currentY += 8;
            
            // テーブル行の取得
            const rows = previewBody.querySelectorAll('tr');
            
            // 各行のデータを取得してPDFに描画
            doc.setFontSize(9);
            
            const rowHeight = 7;
            let rowCount = 0;
            
            // 行の描画関数
            const drawRow = (rowData) => {
                // 偶数行の背景色
                if (rowCount % 2 === 1) {
                    doc.setFillColor(245, 245, 245);
                    doc.rect(startX, currentY, contentWidth, rowHeight, 'F');
                }
                
                // 行のデータ
                let colX = startX;
                rowData.forEach((cellData, index) => {
                    doc.text(cellData, colX + 2, currentY + 5);
                    colX += colWidths[index];
                });
                
                // 縦線を描画
                colX = startX;
                for (let i = 0; i <= colWidths.length; i++) {
                    doc.line(colX, currentY, colX, currentY + rowHeight);
                    if (i < colWidths.length) colX += colWidths[i];
                }
                
                // 横線を描画
                doc.line(startX, currentY, startX + contentWidth, currentY);
                doc.line(startX, currentY + rowHeight, startX + contentWidth, currentY + rowHeight);
                
                currentY += rowHeight;
                rowCount++;
            };
            
            if (rows.length > 0) {
                rows.forEach(row => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length === 7) {
                        const rowData = Array.from(cells).map(cell => cell.textContent.trim());
                        drawRow(rowData);
                    }
                });
            } else if (group && group.lines) {
                // グループデータから直接描画
                group.lines.forEach((line, index) => {
                    const rowData = [
                        line.phoneNumber || '',
                        line.mnpNumber || '',
                        line.carrier || '',
                        `${index + 1}${line.sourceName || ''}`,
                        line.destName || '',
                        line.user || '',
                        line.relation === 'その他' ? `その他(${line.otherRelation || ''})` : line.relation || ''
                    ];
                    drawRow(rowData);
                });
            }
            
            // 最後の縦線を閉じる
            if (rowCount > 0) {
                doc.line(startX, currentY - rowHeight, startX, currentY);
                doc.line(startX + contentWidth, currentY - rowHeight, startX + contentWidth, currentY);
            }
            
            // フッター情報追加
            doc.setFontSize(8);
            const now = new Date();
            const footerText = `出力日時: ${now.toLocaleString('ja-JP')}`;
            doc.text(footerText, pdfWidth - margin - 2, pdfHeight - 5);
            
            // ファイル名生成（日付スタンプ付き）
            const timestamp = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
            
            // 選択グループに基づくファイル名設定
            let fileName;
            
            if (group) {
                fileName = `MNP契約情報_${group.groupName || group.customerName || 'グループ'}_${timestamp}.pdf`;
            } else {
                fileName = `MNP契約情報_全体_${timestamp}.pdf`;
            }
            
            // PDF保存
            console.log('PDF保存:', fileName);
            doc.save(fileName);
            console.log('PDF生成完了');
            
            return true;
        } catch (error) {
            console.error('テキストPDF出力処理エラー:', error);
            alert('PDF生成中にエラーが発生しました: ' + error.message);
            throw error;
        }
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