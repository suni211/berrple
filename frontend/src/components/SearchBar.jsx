import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/SearchBar.css';

const SearchBar = ({ className = '' }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const debounceTimer = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length >= 2) {
      // Debounce autocomplete requests
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      debounceTimer.current = setTimeout(() => {
        loadSuggestions(query);
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query]);

  const loadSuggestions = async (searchQuery) => {
    try {
      const response = await axios.get(`/api/search/autocomplete?q=${encodeURIComponent(searchQuery)}&limit=8`);
      setSuggestions(response.data.suggestions);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    }
  };

  const handleSearch = (searchQuery = query) => {
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowSuggestions(false);
      setQuery('');
    }
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        handleSearch();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > -1 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSuggestionClick(suggestions[selectedIndex]);
        } else {
          handleSearch();
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleSuggestionClick = (suggestion) => {
    if (suggestion.type === 'video') {
      navigate(`/video/${suggestion.id}`);
    } else if (suggestion.type === 'channel') {
      navigate(`/channel/${suggestion.id}`);
    } else if (suggestion.type === 'tag') {
      navigate(`/search?q=${encodeURIComponent(suggestion.text)}`);
    }
    setShowSuggestions(false);
    setQuery('');
    setSelectedIndex(-1);
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'video':
        return '🎬';
      case 'channel':
        return '👤';
      case 'tag':
        return '🏷️';
      default:
        return '🔍';
    }
  };

  return (
    <div className={`search-bar ${className}`} ref={searchRef}>
      <div className="search-input-wrapper">
        <input
          type="text"
          className="search-input"
          placeholder="검색..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim().length >= 2 && suggestions.length > 0 && setShowSuggestions(true)}
        />
        <button
          className="search-button"
          onClick={() => handleSearch()}
          aria-label="검색"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </button>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="suggestions-dropdown">
          {suggestions.map((suggestion, index) => (
            <div
              key={`${suggestion.type}-${suggestion.id || suggestion.text}-${index}`}
              className={`suggestion-item ${index === selectedIndex ? 'selected' : ''}`}
              onClick={() => handleSuggestionClick(suggestion)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <span className="suggestion-icon">{getTypeIcon(suggestion.type)}</span>

              {suggestion.type === 'video' && (
                <div className="suggestion-content">
                  {suggestion.thumbnail && (
                    <img
                      src={suggestion.thumbnail}
                      alt=""
                      className="suggestion-thumbnail"
                    />
                  )}
                  <div className="suggestion-text">
                    <div className="suggestion-title">{suggestion.text}</div>
                    <div className="suggestion-meta">{suggestion.channel}</div>
                  </div>
                </div>
              )}

              {suggestion.type === 'channel' && (
                <div className="suggestion-content">
                  {suggestion.avatar && (
                    <img
                      src={suggestion.avatar}
                      alt=""
                      className="suggestion-avatar"
                    />
                  )}
                  <div className="suggestion-text">
                    <div className="suggestion-title">{suggestion.text}</div>
                    <div className="suggestion-meta">
                      채널 · 동영상 {suggestion.videoCount}개
                    </div>
                  </div>
                </div>
              )}

              {suggestion.type === 'tag' && (
                <div className="suggestion-content">
                  <div className="suggestion-text">
                    <div className="suggestion-title">{suggestion.text}</div>
                    <div className="suggestion-meta">
                      태그 · 동영상 {suggestion.videoCount}개
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
