import { css } from "lit";

export const sharedStyles = css`
  :host {
    display: block;
    --card-primary-color: var(--primary-color, #03a9f4);
    --card-secondary-color: var(--secondary-color, #ff9800);
    --card-background-color: var(--card-background-color, white);
    --card-text-color: var(--primary-text-color, #212121);
    --success-color: var(--success-color, #4caf50);
    --warning-color: var(--warning-color, #ff9800);
    --error-color: var(--error-color, #f44336);
    --divider-color: var(--divider-color, #e0e0e0);
  }

  ha-card {
    display: flex;
    flex-direction: column;
    padding: 16px;
    height: 100%;
    box-sizing: border-box;
    background: var(--card-background-color);
    color: var(--card-text-color);
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .title {
    font-size: 18px;
    font-weight: 500;
  }

  .status-badge {
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
    text-transform: uppercase;
  }

  .status-badge.connected {
    background-color: rgba(76, 175, 80, 0.2);
    color: var(--success-color);
  }

  .status-badge.connecting {
    background-color: rgba(255, 152, 0, 0.2);
    color: var(--warning-color);
  }

  .status-badge.disconnected {
    background-color: rgba(244, 67, 54, 0.2);
    color: var(--error-color);
  }

  .content {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 24px;
  }

  .controls {
    display: flex;
    gap: 16px;
  }

  .main-button {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    border: none;
    background: var(--divider-color);
    color: var(--card-text-color);
    font-size: 32px;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  }

  .main-button:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 12px rgba(0,0,0,0.15);
  }

  .main-button:active {
    transform: scale(0.95);
  }

  .main-button.active {
    background: var(--success-color);
    color: white;
    animation: pulse 2s infinite;
  }

  .main-button.error {
    background: var(--error-color);
    color: white;
  }

  @keyframes pulse {
    0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4); }
    70% { box-shadow: 0 0 0 15px rgba(76, 175, 80, 0); }
    100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
  }

  .visualization {
    width: 100%;
    height: 64px;
    background: rgba(0,0,0,0.05);
    border-radius: 8px;
    overflow: hidden;
  }

  canvas {
    width: 100%;
    height: 100%;
  }

  .stats {
    display: flex;
    gap: 16px;
    font-size: 12px;
    color: var(--secondary-text-color, #757575);
  }

  .error-message {
    background-color: var(--error-color, #f44336);
    color: white;
    font-size: 14px;
    text-align: center;
    padding: 8px 12px;
    border-radius: 4px;
    margin-top: 16px;
    font-weight: 500;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }
`;
