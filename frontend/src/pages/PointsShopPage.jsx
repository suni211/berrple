import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coins, ShoppingBag, Package, TrendingUp, Award, Palette, MessageCircle, Crown } from 'lucide-react';
import axios from 'axios';
import './PointsShopPage.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const CATEGORY_ICONS = {
  'nickname_color': Palette,
  'badge': Award,
  'cloud_color': MessageCircle,
  'title': Crown
};

const CATEGORY_NAMES = {
  'nickname_color': '닉네임 색상',
  'badge': '프로필 뱃지',
  'cloud_color': '구름 댓글 색상',
  'title': '칭호'
};

const ICON_EMOJI_MAP = {
  'seedling': '🌱',
  'star': '⭐',
  'crown': '👑',
  'fire': '🔥',
  'heart': '💝',
  'diamond': '💎',
  'red': '🔴',
  'blue': '🔵',
  'purple': '🟣',
  'gold': '🟡',
  'rainbow': '🌈',
  'pink': '🩷',
  'sky': '☁️',
  'mint': '🍃',
  'yellow': '💛',
  'king': '👑',
  'beta': '🔰',
  'vip': '⭐',
  'cloud': '☁️'
};

export default function PointsShopPage() {
  const [points, setPoints] = useState({ available: 0, total: 0, spent: 0 });
  const [shopItems, setShopItems] = useState({ grouped: {} });
  const [inventory, setInventory] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [customization, setCustomization] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [purchasing, setPurchasing] = useState(null);
  const [activeTab, setActiveTab] = useState('shop'); // 'shop', 'inventory', 'history'
  const navigate = useNavigate();

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      if (!token) {
        navigate('/login');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      const [pointsRes, shopRes, inventoryRes, transactionsRes, customizationRes] = await Promise.all([
        axios.get(`${API_URL}/points/balance`, { headers }),
        axios.get(`${API_URL}/points/shop`, { headers }),
        axios.get(`${API_URL}/points/inventory`, { headers }),
        axios.get(`${API_URL}/points/transactions?limit=20`, { headers }),
        axios.get(`${API_URL}/points/customization`, { headers })
      ]);

      setPoints(pointsRes.data);
      setShopItems(shopRes.data);
      setInventory(inventoryRes.data.inventory);
      setTransactions(transactionsRes.data.transactions);
      setCustomization(customizationRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      if (error.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (itemId) => {
    if (purchasing) return;

    try {
      setPurchasing(itemId);
      const token = localStorage.getItem('token');

      await axios.post(
        `${API_URL}/points/purchase/${itemId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('구매 완료!');
      await fetchAllData(); // Refresh all data
    } catch (error) {
      console.error('Purchase error:', error);
      alert(error.response?.data?.error || '구매 실패');
    } finally {
      setPurchasing(null);
    }
  };

  const handleEquip = async (itemType, itemId) => {
    try {
      const token = localStorage.getItem('token');

      await axios.post(
        `${API_URL}/points/equip`,
        { itemType, itemId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('장착 완료!');
      await fetchAllData();
    } catch (error) {
      console.error('Equip error:', error);
      alert(error.response?.data?.error || '장착 실패');
    }
  };

  const handleUnequip = async (itemType) => {
    try {
      const token = localStorage.getItem('token');

      await axios.post(
        `${API_URL}/points/unequip`,
        { itemType },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('해제 완료!');
      await fetchAllData();
    } catch (error) {
      console.error('Unequip error:', error);
      alert('해제 실패');
    }
  };

  const isOwned = (itemId) => {
    return inventory.some(item => item.shop_item_id === itemId);
  };

  const isEquipped = (itemId) => {
    return Object.values(customization).includes(itemId);
  };

  const renderItemIcon = (iconUrl) => {
    const emoji = ICON_EMOJI_MAP[iconUrl] || iconUrl || '🎁';

    // Create emoji as image using canvas
    return (
      <div
        className="item-icon-emoji"
        style={{
          fontSize: '3rem',
          lineHeight: 1,
          textAlign: 'center'
        }}
      >
        {emoji}
      </div>
    );
  };

  const renderColorPreview = (colorCode) => {
    if (colorCode === 'rainbow') {
      return (
        <div className="color-preview rainbow-gradient"></div>
      );
    }
    return (
      <div className="color-preview" style={{ backgroundColor: colorCode }}></div>
    );
  };

  const getFilteredItems = () => {
    if (selectedCategory === 'all') {
      return shopItems.items || [];
    }
    return shopItems.grouped[selectedCategory] || [];
  };

  if (loading) {
    return (
      <div className="points-shop-page">
        <div className="container">
          <div className="loading-container">
            <div className="spinner"></div>
            <p>로딩 중...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="points-shop-page">
      <div className="container">
        {/* Header with Points Balance */}
        <div className="shop-header">
          <div className="header-content">
            <h1>
              <ShoppingBag size={40} />
              포인트 샵
            </h1>
            <p className="subtitle">포인트로 특별한 아이템을 구매하세요!</p>
          </div>
          <div className="points-display">
            <Coins size={32} />
            <div className="points-info">
              <div className="points-amount">{points.available.toLocaleString()}</div>
              <div className="points-label">보유 포인트</div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-cards">
          <div className="stat-card">
            <TrendingUp size={24} />
            <div className="stat-content">
              <div className="stat-value">{points.total.toLocaleString()}</div>
              <div className="stat-label">총 획득</div>
            </div>
          </div>
          <div className="stat-card">
            <Package size={24} />
            <div className="stat-content">
              <div className="stat-value">{inventory.length}</div>
              <div className="stat-label">보유 아이템</div>
            </div>
          </div>
          <div className="stat-card">
            <ShoppingBag size={24} />
            <div className="stat-content">
              <div className="stat-value">{points.spent.toLocaleString()}</div>
              <div className="stat-label">총 사용</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'shop' ? 'active' : ''}`}
            onClick={() => setActiveTab('shop')}
          >
            <ShoppingBag size={20} />
            상점
          </button>
          <button
            className={`tab ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            <Package size={20} />
            인벤토리
          </button>
          <button
            className={`tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <TrendingUp size={20} />
            거래 내역
          </button>
        </div>

        {/* Shop Tab */}
        {activeTab === 'shop' && (
          <>
            {/* Category Filter */}
            <div className="category-filter">
              <button
                className={`filter-btn ${selectedCategory === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('all')}
              >
                전체
              </button>
              {Object.keys(shopItems.grouped || {}).map((category) => {
                const Icon = CATEGORY_ICONS[category];
                return (
                  <button
                    key={category}
                    className={`filter-btn ${selectedCategory === category ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(category)}
                  >
                    {Icon && <Icon size={16} />}
                    {CATEGORY_NAMES[category]}
                  </button>
                );
              })}
            </div>

            {/* Shop Items Grid */}
            <div className="shop-grid">
              {getFilteredItems().map((item) => (
                <div key={item.id} className={`shop-item ${isOwned(item.id) ? 'owned' : ''}`}>
                  <div className="item-header">
                    {renderItemIcon(item.icon_url)}
                    {item.color_code && renderColorPreview(item.color_code)}
                  </div>
                  <div className="item-body">
                    <h3 className="item-name">{item.item_name}</h3>
                    <p className="item-description">{item.item_description}</p>
                    <div className="item-footer">
                      <div className="item-price">
                        <Coins size={18} />
                        {item.price.toLocaleString()}P
                      </div>
                      {isOwned(item.id) ? (
                        <span className="owned-badge">보유중</span>
                      ) : (
                        <button
                          className="btn-purchase"
                          onClick={() => handlePurchase(item.id)}
                          disabled={purchasing === item.id || points.available < item.price}
                        >
                          {purchasing === item.id ? '구매중...' : '구매'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Inventory Tab */}
        {activeTab === 'inventory' && (
          <div className="inventory-section">
            {inventory.length === 0 ? (
              <div className="empty-state">
                <Package size={64} />
                <p>보유한 아이템이 없습니다</p>
                <button className="btn-primary" onClick={() => setActiveTab('shop')}>
                  상점 가기
                </button>
              </div>
            ) : (
              <div className="inventory-grid">
                {inventory.map((item) => (
                  <div key={item.id} className="inventory-item">
                    <div className="item-header">
                      {renderItemIcon(item.icon_url)}
                      {item.color_code && renderColorPreview(item.color_code)}
                    </div>
                    <div className="item-body">
                      <h3 className="item-name">{item.item_name}</h3>
                      <p className="item-type">{CATEGORY_NAMES[item.item_type]}</p>
                      {item.expires_at && (
                        <p className="expiry-date">
                          만료: {new Date(item.expires_at).toLocaleDateString('ko-KR')}
                        </p>
                      )}
                      <div className="item-actions">
                        {isEquipped(item.shop_item_id) ? (
                          <button
                            className="btn-equipped"
                            onClick={() => handleUnequip(item.item_type)}
                          >
                            장착중
                          </button>
                        ) : (
                          <button
                            className="btn-equip"
                            onClick={() => handleEquip(item.item_type, item.shop_item_id)}
                          >
                            장착하기
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="history-section">
            {transactions.length === 0 ? (
              <div className="empty-state">
                <TrendingUp size={64} />
                <p>거래 내역이 없습니다</p>
              </div>
            ) : (
              <div className="transactions-list">
                {transactions.map((tx) => (
                  <div key={tx.id} className={`transaction-item ${tx.transaction_type}`}>
                    <div className="transaction-info">
                      <div className="transaction-icon">
                        {tx.transaction_type === 'earn' ? '📥' : '📤'}
                      </div>
                      <div className="transaction-details">
                        <div className="transaction-description">{tx.description}</div>
                        <div className="transaction-date">
                          {new Date(tx.created_at).toLocaleString('ko-KR')}
                        </div>
                      </div>
                    </div>
                    <div className="transaction-amount">
                      <span className={tx.transaction_type === 'earn' ? 'positive' : 'negative'}>
                        {tx.transaction_type === 'earn' ? '+' : '-'}{tx.amount.toLocaleString()}P
                      </span>
                      <div className="balance-after">
                        잔액: {tx.balance_after.toLocaleString()}P
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
