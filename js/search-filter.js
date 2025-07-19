/**
 * 検索・フィルター機能
 * MNP契約情報管理表の検索・フィルタリング機能を提供
 */

class SearchFilter {
    constructor() {
        this.initializeElements();
        this.bindEvents();
        this.setupTableObserver();
        this.filters = {
            searchText: '',
            carrier: '',
            dateFrom: '',
            dateTo: ''
        };
        
        // 既存のテーブル更新処理との統合
        this.originalUpdatePreview = null;
        this.setupUpdatePreviewIntegration();
    }

    initializeElements() {
        // 検索・フィルター要素
        this.mainSearch = document.getElementById('main-search');
        this.clearSearch = document.getElementById('clear-search');
        this.showFilters = document.getElementById('show-filters');
        this.advancedFilters = document.getElementById('advanced-filters');
        this.carrierFilter = document.getElementById('carrier-filter');
        this.dateFrom = document.getElementById('date-from');
        this.dateTo = document.getElementById('date-to');
        this.applyFilters = document.getElementById('apply-filters');
        this.resetFilters = document.getElementById('reset-filters');
        this.searchResultsInfo = document.getElementById('search-results-info');
        
        // テーブル要素（既存のIDに合わせて修正）
        this.lineTable = document.getElementById('line-table');
        this.lineTableBody = document.getElementById('line-table-body');
    }

    bindEvents() {
        // メイン検索のリアルタイム検索
        if (this.mainSearch) {
            this.mainSearch.addEventListener('input', (e) => {
                this.filters.searchText = e.target.value.toLowerCase();
                this.performSearch();
            });
        }

        // 検索クリア
        if (this.clearSearch) {
            this.clearSearch.addEventListener('click', () => {
                this.clearAllFilters();
            });
        }

        // 詳細フィルターの表示/非表示
        if (this.showFilters) {
            this.showFilters.addEventListener('click', () => {
                this.toggleAdvancedFilters();
            });
        }

        // フィルター適用
        if (this.applyFilters) {
            this.applyFilters.addEventListener('click', () => {
                this.applyAdvancedFilters();
            });
        }

        // フィルターリセット
        if (this.resetFilters) {
            this.resetFilters.addEventListener('click', () => {
                this.resetAdvancedFilters();
            });
        }

        // キーボードショートカット
        document.addEventListener('keydown', (e) => {
            // Ctrl+F で検索ボックスにフォーカス
            if (e.ctrlKey && e.key === 'f') {
                e.preventDefault();
                if (this.mainSearch) {
                    this.mainSearch.focus();
                }
            }
            // Escape で検索をクリア
            if (e.key === 'Escape' && document.activeElement === this.mainSearch) {
                this.clearAllFilters();
            }
        });
    }

    setupTableObserver() {
        // テーブルの行が動的に追加/削除された際に検索を再実行
        if (this.lineTableBody) {
            const observer = new MutationObserver((mutations) => {
                let shouldRefresh = false;
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList') {
                        shouldRefresh = true;
                    }
                });
                
                if (shouldRefresh) {
                    // 少し遅延してから実行（DOM更新完了を待つ）
                    setTimeout(() => {
                        this.performSearch();
                    }, 100);
                }
            });
            
            observer.observe(this.lineTableBody, {
                childList: true,
                subtree: true
            });
        }
    }

    setupUpdatePreviewIntegration() {
        // 既存のupdatePreview関数との統合
        // グローバルスコープのupdatePreview関数を拡張
        const self = this;
        
        // ページ読み込み完了後に統合処理を実行
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => self.integrateWithExistingFunctions(), 500);
            });
        } else {
            setTimeout(() => self.integrateWithExistingFunctions(), 500);
        }
    }

    integrateWithExistingFunctions() {
        // グローバルに定義されている可能性のある関数を探す
        if (typeof window.updatePreview === 'function') {
            const originalUpdatePreview = window.updatePreview;
            window.updatePreview = (...args) => {
                const result = originalUpdatePreview.apply(this, args);
                // updatePreview実行後に検索を再実行
                setTimeout(() => this.performSearch(), 50);
                return result;
            };
        }
        
        // refreshSearchResults関数をグローバルに公開（既存コードから呼び出し可能）
        window.refreshSearchResults = () => this.performSearch();
    }

    performSearch() {
        if (!this.lineTableBody) {
            console.warn('検索対象のテーブルボディが見つかりません');
            return;
        }

        const rows = this.lineTableBody.querySelectorAll('tr');
        let visibleCount = 0;
        let totalCount = rows.length;

        rows.forEach(row => {
            const isMatch = this.isRowMatch(row);
            
            if (isMatch) {
                row.classList.remove('search-hidden');
                row.classList.add('search-match');
                row.style.display = '';
                visibleCount++;
            } else {
                row.classList.add('search-hidden');
                row.classList.remove('search-match');
                row.style.display = 'none';
            }
        });

        this.updateSearchResults(visibleCount, totalCount);
    }

    isRowMatch(row) {
        if (!row || row.children.length === 0) return false;

        // セルの内容を取得（削除ボタン列は除く）
        const cells = Array.from(row.children);
        if (cells.length < 2) return false;

        // 各セルから検索対象のテキストを抽出
        let searchableTexts = [];
        
        cells.forEach((cell, index) => {
            if (index === 0) return; // 削除ボタン列はスキップ
            
            // input要素がある場合はその値を取得
            const input = cell.querySelector('input');
            const select = cell.querySelector('select');
            
            if (input) {
                searchableTexts.push(input.value.toLowerCase());
            } else if (select) {
                searchableTexts.push(select.value.toLowerCase());
                // 選択されたオプションのテキストも追加
                const selectedOption = select.options[select.selectedIndex];
                if (selectedOption) {
                    searchableTexts.push(selectedOption.textContent.toLowerCase());
                }
            } else {
                searchableTexts.push(cell.textContent.toLowerCase());
            }
        });

        // メイン検索テキストでの検索
        if (this.filters.searchText) {
            const allText = searchableTexts.join(' ');
            if (!allText.includes(this.filters.searchText)) {
                return false;
            }
        }

        // キャリアフィルター（既存のselect要素から値を取得）
        if (this.filters.carrier) {
            const carrierCell = cells[3]; // 移転元キャリア列（0ベースで3番目）
            if (carrierCell) {
                const carrierSelect = carrierCell.querySelector('select');
                const carrierValue = carrierSelect ? carrierSelect.value.toLowerCase() : 
                                  carrierCell.textContent.toLowerCase();
                
                const carrierMap = {
                    'docomo': ['docomo', 'ドコモ', 'ntt'],
                    'au': ['au', 'kddi'],
                    'softbank': ['softbank', 'ソフトバンク', 'sb'],
                    'rakuten': ['rakuten', '楽天'],
                    'other': []
                };

                const filterCarriers = carrierMap[this.filters.carrier] || [];
                let carrierMatch = false;

                if (this.filters.carrier === 'other') {
                    // その他の場合、主要キャリア以外かチェック
                    const majorCarriers = ['docomo', 'ドコモ', 'ntt', 'au', 'kddi', 'softbank', 'ソフトバンク', 'sb', 'rakuten', '楽天'];
                    carrierMatch = !majorCarriers.some(mc => carrierValue.includes(mc));
                } else {
                    carrierMatch = filterCarriers.some(fc => carrierValue.includes(fc));
                }

                if (!carrierMatch) {
                    return false;
                }
            }
        }

        // 日付フィルター（将来的な機能拡張用）
        // 現在のテーブル構造では日付列がないため、ヘッダー情報で判断する必要がある

        return true;
    }

    toggleAdvancedFilters() {
        if (!this.advancedFilters || !this.showFilters) return;
        
        const isVisible = this.advancedFilters.style.display !== 'none';
        
        if (isVisible) {
            this.advancedFilters.style.display = 'none';
            this.showFilters.textContent = '詳細フィルター ▼';
            this.showFilters.classList.remove('active');
        } else {
            this.advancedFilters.style.display = 'block';
            this.showFilters.textContent = '詳細フィルター ▲';
            this.showFilters.classList.add('active');
        }
    }

    applyAdvancedFilters() {
        if (this.carrierFilter) this.filters.carrier = this.carrierFilter.value;
        if (this.dateFrom) this.filters.dateFrom = this.dateFrom.value;
        if (this.dateTo) this.filters.dateTo = this.dateTo.value;
        
        this.performSearch();
    }

    resetAdvancedFilters() {
        if (this.carrierFilter) this.carrierFilter.value = '';
        if (this.dateFrom) this.dateFrom.value = '';
        if (this.dateTo) this.dateTo.value = '';
        
        this.filters.carrier = '';
        this.filters.dateFrom = '';
        this.filters.dateTo = '';
        
        this.performSearch();
    }

    clearAllFilters() {
        // メイン検索をクリア
        if (this.mainSearch) {
            this.mainSearch.value = '';
            this.filters.searchText = '';
        }
        
        // 詳細フィルターもクリア
        this.resetAdvancedFilters();
        
        // 詳細フィルターを閉じる
        if (this.advancedFilters && this.showFilters) {
            this.advancedFilters.style.display = 'none';
            this.showFilters.textContent = '詳細フィルター ▼';
            this.showFilters.classList.remove('active');
        }
    }

    updateSearchResults(visibleCount, totalCount) {
        if (!this.searchResultsInfo) return;
        
        const hasActiveFilters = this.filters.searchText || this.filters.carrier || 
                                this.filters.dateFrom || this.filters.dateTo;
        
        if (hasActiveFilters) {
            this.searchResultsInfo.style.display = 'block';
            this.searchResultsInfo.classList.add('show');
            
            if (visibleCount === 0) {
                this.searchResultsInfo.classList.add('no-results');
                this.searchResultsInfo.classList.remove('has-results');
                this.searchResultsInfo.textContent = '検索条件に一致する項目が見つかりませんでした。';
            } else {
                this.searchResultsInfo.classList.add('has-results');
                this.searchResultsInfo.classList.remove('no-results');
                this.searchResultsInfo.textContent = `${totalCount}件中 ${visibleCount}件を表示しています。`;
            }
        } else {
            this.searchResultsInfo.style.display = 'none';
            this.searchResultsInfo.classList.remove('show', 'no-results', 'has-results');
            
            // すべての行を表示
            if (this.lineTableBody) {
                const rows = this.lineTableBody.querySelectorAll('tr');
                rows.forEach(row => {
                    row.classList.remove('search-hidden', 'search-match');
                    row.style.display = '';
                });
            }
        }
    }

    // 外部からの検索実行（他のスクリプトから呼び出し可能）
    executeSearch(searchText = '') {
        if (this.mainSearch) {
            this.mainSearch.value = searchText;
            this.filters.searchText = searchText.toLowerCase();
            this.performSearch();
        }
    }

    // フィルター状態の取得
    getFilterState() {
        return { ...this.filters };
    }

    // フィルター状態の設定
    setFilterState(filters) {
        this.filters = { ...this.filters, ...filters };
        
        if (filters.searchText !== undefined && this.mainSearch) {
            this.mainSearch.value = filters.searchText;
        }
        if (filters.carrier !== undefined && this.carrierFilter) {
            this.carrierFilter.value = filters.carrier;
        }
        if (filters.dateFrom !== undefined && this.dateFrom) {
            this.dateFrom.value = filters.dateFrom;
        }
        if (filters.dateTo !== undefined && this.dateTo) {
            this.dateTo.value = filters.dateTo;
        }
        
        this.performSearch();
    }

    // テーブルの行数変更を検知して検索を更新
    refreshOnTableChange() {
        this.performSearch();
    }
}

// DOM読み込み完了後に初期化
document.addEventListener('DOMContentLoaded', () => {
    // 検索機能の初期化（既存のアプリケーション初期化後に実行）
    setTimeout(() => {
        try {
            window.searchFilter = new SearchFilter();
            
            // グローバルアクセス用の関数も提供
            window.performSearch = () => {
                if (window.searchFilter) {
                    window.searchFilter.performSearch();
                }
            };
            
            window.clearSearch = () => {
                if (window.searchFilter) {
                    window.searchFilter.clearAllFilters();
                }
            };
            
            console.log('検索・フィルター機能が初期化されました');
        } catch (error) {
            console.error('検索・フィルター機能の初期化中にエラー:', error);
        }
    }, 1000); // 既存のアプリケーション初期化を待つ
});

// テーブルの行が追加/削除された際に検索を再実行する関数
// 既存のアプリケーションから呼び出すためのユーティリティ
function refreshSearchResults() {
    if (window.searchFilter) {
        window.searchFilter.refreshOnTableChange();
    }
}

// 既存のaddLineRow関数の後に呼び出すための関数
function onLineRowAdded() {
    if (window.searchFilter) {
        setTimeout(() => {
            window.searchFilter.performSearch();
        }, 100);
    }
}