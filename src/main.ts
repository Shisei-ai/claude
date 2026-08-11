/**
 * エントリポイント。
 *
 * ここから先、UI は domain/ を呼ぶだけ。計算はすべて domain/ 側にある。
 */

import './ui/styles.css';
import { startApp } from './ui/app';

startApp();
