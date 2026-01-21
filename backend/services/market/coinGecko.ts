// services/market/coinGecko.ts
// CoinGecko API - Criptomonedas (100% gratuito, sin API key)

import type { CryptoPrice, CryptoCoin } from './types.js'

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3'

const COIN_INFO: Record<CryptoCoin, { name: string; symbol: string }> = {
  bitcoin: { name: 'Bitcoin', symbol: 'BTC' },
  ethereum: { name: 'Ethereum', symbol: 'ETH' }
}

export async function getCryptoPrices(
  coins: CryptoCoin[] = ['bitcoin', 'ethereum']
): Promise<Record<CryptoCoin, CryptoPrice>> {
  const ids = coins.join(',')
  const url = `${COINGECKO_BASE}/simple/price?ids=${ids}&vs_currencies=eur&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`

  const startTime = Date.now()
  console.log(`[Market:CoinGecko] Fetching prices for: ${coins.join(', ')}`)

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Market:CoinGecko] API error: ${response.status} - ${errorText}`)
      
      if (response.status === 429) {
        console.warn('[Market:CoinGecko] Rate limit hit, using fallback values')
        return getFallbackCryptoPrices(coins)
      }
      
      return getFallbackCryptoPrices(coins)
    }

    const data = await response.json()
    const elapsed = Date.now() - startTime
    console.log(`[Market:CoinGecko] Response received in ${elapsed}ms`)

    const result: Record<CryptoCoin, CryptoPrice> = {} as Record<CryptoCoin, CryptoPrice>

    for (const coin of coins) {
      const coinData = data[coin]
      if (coinData) {
        result[coin] = {
          symbol: COIN_INFO[coin].symbol,
          name: COIN_INFO[coin].name,
          price: coinData.eur || 0,
          change24h: coinData.eur_24h_change || 0,
          volume24h: coinData.eur_24h_vol,
          marketCap: coinData.eur_market_cap,
          source: 'coingecko'
        }
      }
    }

    return result
  } catch (error) {
    const elapsed = Date.now() - startTime
    console.error(`[Market:CoinGecko] Error after ${elapsed}ms:`, error)
    return getFallbackCryptoPrices(coins)
  }
}

function getFallbackCryptoPrices(coins: CryptoCoin[]): Record<CryptoCoin, CryptoPrice> {
  console.warn('[Market:CoinGecko] Using fallback prices')
  
  const fallbackPrices: Record<CryptoCoin, CryptoPrice> = {
    bitcoin: {
      symbol: 'BTC',
      name: 'Bitcoin',
      price: 98500,
      change24h: 0,
      source: 'coingecko'
    },
    ethereum: {
      symbol: 'ETH',
      name: 'Ethereum',
      price: 3450,
      change24h: 0,
      source: 'coingecko'
    }
  }

  const result: Record<CryptoCoin, CryptoPrice> = {} as Record<CryptoCoin, CryptoPrice>
  for (const coin of coins) {
    result[coin] = fallbackPrices[coin]
  }
  return result
}

export async function getBitcoinPrice(): Promise<CryptoPrice> {
  const prices = await getCryptoPrices(['bitcoin'])
  return prices.bitcoin
}

export async function getEthereumPrice(): Promise<CryptoPrice> {
  const prices = await getCryptoPrices(['ethereum'])
  return prices.ethereum
}

export async function getTopCryptos(limit: number = 10): Promise<CryptoPrice[]> {
  const url = `${COINGECKO_BASE}/coins/markets?vs_currency=eur&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false&price_change_percentage=24h`

  try {
    const response = await fetch(url)
    if (!response.ok) return []

    const data = await response.json()

    return data.map((coin: any) => ({
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      price: coin.current_price,
      change24h: coin.price_change_percentage_24h || 0,
      volume24h: coin.total_volume,
      marketCap: coin.market_cap,
      source: 'coingecko' as const
    }))
  } catch (error) {
    console.error('[Market:CoinGecko] Error fetching top cryptos:', error)
    return []
  }
}
