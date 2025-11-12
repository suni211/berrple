import { useState, useEffect } from 'react';
import { X, Copy, Check, Users, Gift } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function ReferralModal({ isOpen, onClose }) {
  const [referralData, setReferralData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchReferralData();
    }
  }, [isOpen]);

  const fetchReferralData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/referrals/my-code`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReferralData(response.data);
      setError(null);
    } catch (err) {
      setError('추천 정보를 불러올 수 없습니다.');
      console.error('Failed to fetch referral data:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    const referralUrl = `${window.location.origin}/register?ref=${referralData.code}`;
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-t-lg">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-2">🎁 친구 초대하고 선물 받기</h2>
              <p className="text-purple-100">친구를 초대하면 멋진 선물을 드립니다!</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-600">{error}</div>
          ) : (
            <>
              {/* Referral Code Section */}
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold mb-3 text-gray-800">내 추천 코드</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={`${window.location.origin}/register?ref=${referralData.code}`}
                    readOnly
                    className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2 font-medium"
                  >
                    {copied ? (
                      <>
                        <Check size={20} />
                        복사완료
                      </>
                    ) : (
                      <>
                        <Copy size={20} />
                        복사
                      </>
                    )}
                  </button>
                </div>
                <div className="mt-3 text-sm text-gray-600">
                  코드: <span className="font-mono font-bold text-purple-600">{referralData.code}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <Users className="mx-auto mb-2 text-blue-600" size={32} />
                  <div className="text-3xl font-bold text-blue-600">{referralData.referralCount}</div>
                  <div className="text-sm text-gray-600">초대한 친구</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <Gift className="mx-auto mb-2 text-green-600" size={32} />
                  <div className="text-3xl font-bold text-green-600">{referralData.rewards?.length || 0}</div>
                  <div className="text-sm text-gray-600">받은 보상</div>
                </div>
              </div>

              {/* Milestones */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">보상 단계</h3>
                <div className="space-y-3">
                  {referralData.milestones.map((milestone) => (
                    <div
                      key={milestone.count}
                      className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                        milestone.reached
                          ? 'bg-green-50 border-green-300'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            milestone.reached ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
                          }`}
                        >
                          {milestone.reached ? <Check size={20} /> : milestone.count}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800">
                            {milestone.count}명 초대
                          </div>
                          <div className="text-sm text-gray-600">기프티콘 증정</div>
                        </div>
                      </div>
                      <div className="text-right">
                        {milestone.reached ? (
                          <span className="text-green-600 font-semibold">달성!</span>
                        ) : (
                          <span className="text-gray-500">
                            {milestone.count - referralData.referralCount}명 남음
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Referred Users List */}
              {referralData.referredUsers && referralData.referredUsers.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">
                    초대한 친구 ({referralData.referredUsers.length}명)
                  </h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {referralData.referredUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <div className="font-medium text-gray-800">{user.display_name}</div>
                          <div className="text-sm text-gray-500">@{user.username}</div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(user.created_at).toLocaleDateString('ko-KR')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rewards List */}
              {referralData.rewards && referralData.rewards.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">보상 내역</h3>
                  <div className="space-y-2">
                    {referralData.rewards.map((reward) => (
                      <div
                        key={reward.id}
                        className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200"
                      >
                        <div>
                          <div className="font-medium text-gray-800">
                            {reward.reward_milestone}명 달성 보상
                          </div>
                          <div className="text-sm text-gray-600">
                            {reward.reward_status === 'sent'
                              ? '✅ 발송 완료'
                              : reward.reward_status === 'notified'
                              ? '⏳ 확인 중'
                              : '🎁 대기 중'}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(reward.created_at).toLocaleDateString('ko-KR')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">💡 사용 방법</h4>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>위의 추천 링크를 복사하세요</li>
                  <li>친구에게 링크를 공유하세요</li>
                  <li>친구가 링크를 통해 가입하면 자동으로 카운트됩니다</li>
                  <li>목표 인원 달성 시 이메일로 알림을 받습니다</li>
                  <li>관리자 확인 후 기프티콘이 발송됩니다</li>
                </ol>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
