/**
 * 検索・フィルター機能
 * MNP契約情報管理表の検索・フィルタリング機能を提供
 */

class SearchFilter {
    constructor() {
        this.initializeElements();
        this.bindEvents();
        this.filters = {
            searchText: '',
            carrier: '',
            dateFrom: '',
            dateTo: ''
        };
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
        
        // テーブル要素
        this.lineTable = document.getElementById('line-table');
        this.lineTableBody = document.getElementById('line-table-body');
    }

    bindEvents() {
        // メイン検索のリアルタイム検索
        this.mainSearch.addEventListener('input', (e) => {
            this.filters.searchText = e.target.value.toLowerCase();
            this.performSearch();
        });

        // 検索クリア
        this.clearSearch.addEventListener('click', () => {
            this.clearAllFilters();
        });

        // 詳細フィルターの表示/非表示
        this.showFilters.addEventListener('click', () => {
            this.toggleAdvancedFilters();
        });

        // フィルター適用
        this.applyFilters.addEventListener('click', () => {
            this.applyAdvancedFilters();
        });

        // フィルターリセット
        this.resetFilters.addEventListener('click', () => {
            this.resetAdvancedFilters();
        });

        // キーボードショートカット
        document.addEventListener('keydown', (e) => {
            // Ctrl+F で検索ボックスにフォーカス
            if (e.ctrlKey && e.key === 'f') {
                e.preventDefault();
                this.mainSearch.focus();
            }
            // Escape で検索をクリア
            if (e.key === 'Escape' && document.activeElement === this.mainSearch) {
                this.clearAllFilters();
            }
        });
    }

    performSearch() {
        const rows = this.lineTableBody.querySelectorAll('tr');
        let visibleCount = 0;
        let totalCount = rows.length;

        rows.forEach(row => {
            const isMatch = this.isRowMatch(row);
            
            if (isMatch) {
                row.classList.remove('search-hidden');
                row.classList.add('search-match');
                visibleCount++;
            } else {
                row.classList.add('search-hidden');
                row.classList.remove('search-match');
            }
        });

        this.updateSearchResults(visibleCount, totalCount);
    }

    isRowMatch(row) {
        const cells = row.querySelectorAll('td');
        if (cells.length === 0) return false;

        // セルの内容を取得（操作列は除く）
        const phoneNumber = cells[1]?.textContent?.toLowerCase() || '';
        const mnpNumber = cells[2]?.textContent?.toLowerCase() || '';
        const carrier = cells[3]?.textContent?.toLowerCase() || '';
        const sourceName = cells[4]?.textContent?.toLowerCase() || '';
        const destName = cells[5]?.textContent?.toLowerCase() || '';
        const user = cells[6]?.textContent?.toLowerCase() || '';
        const relation = cells[7]?.textContent?.toLowerCase() || '';

        // メイン検索テキストでの検索
        if (this.filters.searchText) {
            const searchableText = [
                phoneNumber, mnpNumber, carrier, sourceName, destName, user, relation
            ].join(' ');
            
            if (!searchableText.includes(this.filters.searchText)) {
                return false;
            }
        }

        // キャリアフィルター
        if (this.filters.carrier) {
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
                carrierMatch = !majorCarriers.some(mc => carrier.includes(mc));
            } else {
                carrierMatch = filterCarriers.some(fc => carrier.includes(fc));
            }

            if (!carrierMatch) {
                return false;
            }
        }

        // 日付フィルター（今後の機能拡張用）
        // 現在のテーブルには日付列がないため、将来的に実装

        return true;
    }

    toggleAdvancedFilters() {
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
        this.filters.carrier = this.carrierFilter.value;
        this.filters.dateFrom = this.dateFrom.value;
        this.filters.dateTo = this.dateTo.value;
        
        this.performSearch();
    }

    resetAdvancedFilters() {
        this.carrierFilter.value = '';
        this.dateFrom.value = '';
        this.dateTo.value = '';
        
        this.filters.carrier = '';
        this.filters.dateFrom = '';
        this.filters.dateTo = '';
        
        this.performSearch();
    }

    clearAllFilters() {
        // メイン検索をクリア
        this.mainSearch.value = '';
        this.filters.searchText = '';
        
        // 詳細フィルターもクリア
        this.resetAdvancedFilters();
        
        // 詳細フィルターを閉じる
        this.advancedFilters.style.display = 'none';
        this.showFilters.textContent = '詳細フィルター ▼';
        this.showFilters.classList.remove('active');
    }

    updateSearchResults(visibleCount, totalCount) {
        if (this.filters.searchText || this.filters.carrier || this.filters.dateFrom || this.filters.dateTo) {
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
            const rows = this.lineTableBody.querySelectorAll('tr');
            rows.forEach(row => {
                row.classList.remove('search-hidden', 'search-match');
            });
        }
    }

    // 外部からの検索実行（他のスクリプトから呼び出し可能）
    executeSearch(searchText = '') {
        this.mainSearch.value = searchText;
        this.filters.searchText = searchText.toLowerCase();
        this.performSearch();
    }

    // フィルター状態の取得
    getFilterState() {
        return { ...this.filters };
    }

    // フィルター状態の設定
    setFilterState(filters) {
        this.filters = { ...this.filters, ...filters };
        
        if (filters.searchText !== undefined) {
            this.mainSearch.value = filters.searchText;
        }
        if (filters.carrier !== undefined) {
            this.carrierFilter.value = filters.carrier;
        }
        if (filters.dateFrom !== undefined) {
            this.dateFrom.value = filters.dateFrom;
        }
        if (filters.dateTo !== undefined) {
            this.dateTo.value = filters.dateTo;
        }
        
        this.performSearch();
    }
}

// DOM読み込み完了後に初期化
document.addEventListener('DOMContentLoaded', () => {
    // 検索機能の初期化
    window.searchFilter = new SearchFilter();
    
    // グローバルアクセス用の関数も提供
    window.performSearch = () => window.searchFilter.performSearch();
    window.clearSearch = () => window.searchFilter.clearAllFilters();
});

// テーブルの行が追加/削除された際に検索を再実行する関数
// 既存のアプリケーションから呼び出すためのユーティリティ
function refreshSearchResults() {
    if (window.searchFilter) {
        window.searchFilter.performSearch();
    }
}