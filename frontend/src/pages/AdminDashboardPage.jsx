import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import axios from 'axios';
import '../styles/AdminDashboardPage.css';

const AdminDashboardPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState([]);
  const [videos, setVideos] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.is_admin) {
      loadDashboardData();
    }
  }, [user, activeTab]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'overview') {
        const response = await axios.get('/api/admin/dashboard/stats');
        setStats(response.data);
      } else if (activeTab === 'users') {
        const response = await axios.get('/api/admin/users?limit=20');
        setUsers(response.data.users);
      } else if (activeTab === 'videos') {
        const response = await axios.get('/api/admin/videos?limit=20');
        setVideos(response.data.videos);
      } else if (activeTab === 'reports') {
        const response = await axios.get('/api/reports/admin/all?status=pending&limit=20');
        setReports(response.data.reports);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserUpdate = async (userId, updates) => {
    try {
      await axios.patch(`/api/admin/users/${userId}`, updates);
      alert('사용자 정보가 업데이트되었습니다.');
      loadDashboardData();
    } catch (error) {
      console.error('Failed to update user:', error);
      alert('업데이트 실패');
    }
  };

  const handleVideoToggle = async (videoId, isActive) => {
    try {
      await axios.patch(`/api/admin/videos/${videoId}`, { is_active: !isActive });
      alert('동영상 상태가 변경되었습니다.');
      loadDashboardData();
    } catch (error) {
      console.error('Failed to update video:', error);
      alert('업데이트 실패');
    }
  };

  const handleReportUpdate = async (reportId, status, notes = '') => {
    try {
      await axios.patch(`/api/reports/${reportId}`, {
        status,
        adminNotes: notes
      });
      alert('신고가 처리되었습니다.');
      loadDashboardData();
    } catch (error) {
      console.error('Failed to update report:', error);
      alert('처리 실패');
    }
  };

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!user.is_admin) {
    return (
      <div className="admin-dashboard">
        <div className="access-denied">
          <h2>접근 권한이 없습니다</h2>
          <p>관리자만 접근할 수 있습니다.</p>
          <Link to="/">홈으로 돌아가기</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>⚙️ 관리자 대시보드</h1>
      </div>

      <div className="dashboard-tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 개요
        </button>
        <button
          className={`tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 사용자
        </button>
        <button
          className={`tab ${activeTab === 'videos' ? 'active' : ''}`}
          onClick={() => setActiveTab('videos')}
        >
          🎬 동영상
        </button>
        <button
          className={`tab ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          🚨 신고
        </button>
      </div>

      <div className="dashboard-content">
        {loading ? (
          <div className="loading">로딩 중...</div>
        ) : (
          <>
            {activeTab === 'overview' && stats && (
              <div className="stats-grid">
                <div className="stat-card">
                  <h3>사용자</h3>
                  <div className="stat-value">{stats.users.total_users.toLocaleString()}</div>
                  <div className="stat-meta">
                    신규 (24h): {stats.users.new_users_24h} | 인증: {stats.users.verified_users}
                  </div>
                </div>

                <div className="stat-card">
                  <h3>동영상</h3>
                  <div className="stat-value">{stats.videos.total_videos.toLocaleString()}</div>
                  <div className="stat-meta">
                    신규 (24h): {stats.videos.new_videos_24h} | 조회수: {stats.videos.total_views?.toLocaleString()}
                  </div>
                </div>

                <div className="stat-card">
                  <h3>클라우드 댓글</h3>
                  <div className="stat-value">{stats.clouds.total_clouds.toLocaleString()}</div>
                  <div className="stat-meta">
                    신규 (24h): {stats.clouds.new_clouds_24h} | 신고됨: {stats.clouds.flagged_clouds}
                  </div>
                </div>

                <div className="stat-card">
                  <h3>신고</h3>
                  <div className="stat-value">{stats.reports.total_reports.toLocaleString()}</div>
                  <div className="stat-meta">
                    대기 중: {stats.reports.pending_reports} | 신규 (24h): {stats.reports.new_reports_24h}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="users-table">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>사용자명</th>
                      <th>이메일</th>
                      <th>가입일</th>
                      <th>인증</th>
                      <th>관리자</th>
                      <th>동작</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td>{u.id}</td>
                        <td>{u.username}</td>
                        <td>{u.email}</td>
                        <td>{new Date(u.created_at).toLocaleDateString()}</td>
                        <td>
                          <input
                            type="checkbox"
                            checked={u.is_verified}
                            onChange={(e) => handleUserUpdate(u.id, { is_verified: e.target.checked })}
                          />
                        </td>
                        <td>
                          <input
                            type="checkbox"
                            checked={u.is_admin}
                            onChange={(e) => handleUserUpdate(u.id, { is_admin: e.target.checked })}
                          />
                        </td>
                        <td>
                          <Link to={`/channel/${u.id}`} className="btn-small">보기</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'videos' && (
              <div className="videos-table">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>제목</th>
                      <th>채널</th>
                      <th>조회수</th>
                      <th>좋아요</th>
                      <th>활성화</th>
                      <th>동작</th>
                    </tr>
                  </thead>
                  <tbody>
                    {videos.map(v => (
                      <tr key={v.id}>
                        <td>{v.id}</td>
                        <td className="video-title">{v.title}</td>
                        <td>{v.channel_name}</td>
                        <td>{v.view_count.toLocaleString()}</td>
                        <td>{v.like_count.toLocaleString()}</td>
                        <td>
                          <input
                            type="checkbox"
                            checked={v.is_active}
                            onChange={() => handleVideoToggle(v.id, v.is_active)}
                          />
                        </td>
                        <td>
                          <Link to={`/video/${v.id}`} className="btn-small">보기</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'reports' && (
              <div className="reports-list">
                {reports.map(report => (
                  <div key={report.id} className="report-card">
                    <div className="report-header">
                      <span className="report-type">{report.report_type}</span>
                      <span className="report-date">
                        {new Date(report.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="report-body">
                      <p><strong>신고자:</strong> {report.reporter_username}</p>
                      {report.reported_username && (
                        <p><strong>대상:</strong> {report.reported_username}</p>
                      )}
                      <p><strong>사유:</strong> {report.reason}</p>
                    </div>
                    <div className="report-actions">
                      <button
                        className="btn-success"
                        onClick={() => handleReportUpdate(report.id, 'resolved')}
                      >
                        해결됨
                      </button>
                      <button
                        className="btn-warning"
                        onClick={() => handleReportUpdate(report.id, 'reviewed')}
                      >
                        검토 완료
                      </button>
                      <button
                        className="btn-danger"
                        onClick={() => handleReportUpdate(report.id, 'dismissed')}
                      >
                        기각
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboardPage;
