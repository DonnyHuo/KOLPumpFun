import brc20_100t from './brc20-100t.png';
import brc20_ainn from './brc20-ainn.png';
import brc20_bnb from './brc20-bnb.png';
import brc20_btcb from './brc20-btcb.png';
import brc20_btcs from './brc20-btcs.png';
import brc20_deai from './brc20-deai.png';
import brc20_ligo from './brc20-ligo.png';
import brc20_mask from './brc20-mask.png';
import brc20_merm from './brc20-merm.png';
import brc20_newu from './brc20-newu.png';
import brc20_ordi from './brc20-ordi.png';
import brc20_oxbt from './brc20-oxbt.png';
import brc20_pgid from './brc20-pgid.png';
import brc20_piza from './brc20-piza.png';
import brc20_pups from './brc20-pups.png';
import brc20_rats from './brc20-rats.png';
import brc20_sats from './brc20-sats.png';
import brc20_satx from './brc20-satx.png';
import brc20_sbtc from './brc20-sbtc.png';
import brc20_shib from './brc20-shib.png';
import brc20_sos from './brc20-sos.png';
import brc20_usdt from './brc20-usdt.png';
import brc20_wzrd from './brc20-wzrd.png';
import brc20_pi from './brc20-π.png';
import pizza from './pizza.png';

// Token icon mapping for dynamic access
export const tokenIcons: Record<string, typeof brc20_100t> = {
  '100t': brc20_100t,
  'ainn': brc20_ainn,
  'bnb': brc20_bnb,
  'btcb': brc20_btcb,
  'btcs': brc20_btcs,
  'deai': brc20_deai,
  'ligo': brc20_ligo,
  'mask': brc20_mask,
  'merm': brc20_merm,
  'newu': brc20_newu,
  'ordi': brc20_ordi,
  'oxbt': brc20_oxbt,
  'pgid': brc20_pgid,
  'piza': brc20_piza,
  'pups': brc20_pups,
  'rats': brc20_rats,
  'sats': brc20_sats,
  'satx': brc20_satx,
  'sbtc': brc20_sbtc,
  'shib': brc20_shib,
  'sos': brc20_sos,
  'usdt': brc20_usdt,
  'wzrd': brc20_wzrd,
  'π': brc20_pi,
  'pizza': pizza,
};

// Get token icon by name (case insensitive)
export function getTokenIcon(name: string) {
  const key = name.toLowerCase();
  return tokenIcons[key] || brc20_100t; // Default to 100t if not found
}

export default tokenIcons;

