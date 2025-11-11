import './CopyrightPage.css';

function CopyrightPage() {
  return (
    <div className="copyright-page container">
      <div className="copyright-content">
        <h1>저작권 정책</h1>

        <section>
          <h2>1. 기본 원칙</h2>
          <p>
            Berrple은 저작권을 존중하며, 저작권자의 권리를 보호하기 위해 최선을 다하고 있습니다.
          </p>
        </section>

        <section>
          <h2>2. YouTube 콘텐츠 사용</h2>
          <ul>
            <li>본 플랫폼은 YouTube API를 통해 YouTube 영상을 임베드 형식으로 제공합니다.</li>
            <li>모든 YouTube 영상은 원작자에게 저작권이 있으며, Berrple은 어떠한 소유권도 주장하지 않습니다.</li>
            <li>YouTube 영상 재생 시 원작자에게 광고 수익이 전달됩니다.</li>
            <li>YouTube 영상의 조회수는 YouTube에 직접 반영되지 않도록 기술적으로 제한되어 있습니다.</li>
          </ul>
        </section>

        <section>
          <h2>3. 구름 코멘트</h2>
          <ul>
            <li>구름 코멘트는 사용자가 작성한 텍스트 기반의 코멘트입니다.</li>
            <li>구름 코멘트는 원본 영상을 수정하거나 변경하지 않으며, 오버레이 형태로 표시됩니다.</li>
            <li>부적절한 구름 코멘트는 즉시 삭제되며, 반복적인 위반 시 계정이 제재될 수 있습니다.</li>
          </ul>
        </section>

        <section>
          <h2>4. 자체 업로드 콘텐츠</h2>
          <ul>
            <li>사용자가 직접 업로드하는 영상은 업로더가 저작권을 보유하거나 사용 권한이 있어야 합니다.</li>
            <li>타인의 저작물을 무단으로 업로드하는 것은 금지됩니다.</li>
            <li>저작권 침해가 확인될 경우 즉시 삭제되며, 계정이 제재될 수 있습니다.</li>
          </ul>
        </section>

        <section>
          <h2>5. 금지 콘텐츠</h2>
          <ul>
            <li>과도한 선정성 또는 폭력성을 담은 콘텐츠</li>
            <li>정치적 선동 또는 혐오를 조장하는 콘텐츠</li>
            <li>타인의 저작권을 침해하는 콘텐츠</li>
            <li>불법적인 내용을 포함하는 콘텐츠</li>
          </ul>
        </section>

        <section>
          <h2>6. 저작권 침해 신고</h2>
          <p>
            저작권 침해가 의심되는 콘텐츠를 발견하셨다면, 즉시 신고해 주시기 바랍니다.
            신고된 콘텐츠는 검토 후 적절한 조치가 취해집니다.
          </p>
        </section>

        <section>
          <h2>7. Berrple의 약속</h2>
          <ul>
            <li>저작권 침해 신고가 접수되면 24시간 내에 검토합니다.</li>
            <li>명백한 저작권 침해가 확인되면 즉시 콘텐츠를 삭제합니다.</li>
            <li>구름이 포함된 영상이 타 플랫폼에 무단 업로드되는 것을 방지하기 위해 노력합니다.</li>
            <li>저작권자의 요청이 있을 경우 관련 데이터를 제공합니다.</li>
          </ul>
        </section>

        <section>
          <h2>8. 면책 조항</h2>
          <p>
            Berrple은 사용자가 업로드하거나 공유하는 콘텐츠에 대한 책임을 지지 않습니다.
            모든 콘텐츠는 업로더의 책임이며, 저작권 침해가 확인될 경우 법적 책임은 업로더에게 있습니다.
          </p>
        </section>

        <div className="contact-section">
          <h2>문의</h2>
          <p>저작권 관련 문의는 건의개선 게시판을 통해 접수해 주시기 바랍니다.</p>
        </div>
      </div>
    </div>
  );
}

export default CopyrightPage;
