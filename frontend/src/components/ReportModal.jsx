import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import '../styles/ReportModal.css';

const ReportModal = ({ isOpen, onClose, targetType, targetId, targetTitle }) => {
  const { user } = useAuth();
  const [reportType, setReportType] = useState('spam');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const reportTypes = [
    { value: 'spam', label: '스팸 또는 광고' },
    { value: 'harassment', label: '괴롭힘 또는 혐오 발언' },
    { value: 'inappropriate', label: '부적절한 콘텐츠' },
    { value: 'copyright', label: '저작권 침해' },
    { value: 'other', label: '기타' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    if (reason.trim().length < 10) {
      alert('신고 사유를 10자 이상 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const reportData = {
        reportType,
        reason: reason.trim()
      };

      // Set the appropriate field based on targetType
      if (targetType === 'video') {
        reportData.videoId = targetId;
      } else if (targetType === 'cloud') {
        reportData.cloudId = targetId;
      } else if (targetType === 'post') {
        reportData.postId = targetId;
      } else if (targetType === 'comment') {
        reportData.commentId = targetId;
      } else if (targetType === 'user') {
        reportData.reportedUserId = targetId;
      }

      await axios.post('/api/reports', reportData);

      alert('신고가 접수되었습니다. 검토 후 조치하겠습니다.');
      onClose();
      setReason('');
      setReportType('spam');
    } catch (error) {
      console.error('Failed to submit report:', error);
      alert('신고 접수 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>신고하기</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {targetTitle && (
            <div className="report-target">
              <strong>신고 대상:</strong> {targetTitle}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>신고 유형</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                required
              >
                {reportTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>신고 사유 (최소 10자)</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="구체적인 신고 사유를 작성해주세요..."
                rows="5"
                minLength="10"
                maxLength="1000"
                required
              />
              <div className="char-count">
                {reason.length} / 1000
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={onClose}
                disabled={loading}
              >
                취소
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={loading || reason.trim().length < 10}
              >
                {loading ? '제출 중...' : '신고하기'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
