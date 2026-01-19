'use client';

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits, parseUnits, maxUint256 } from 'viem';
import erc20Abi from '@/constants/abi/erc20.json';

// 获取余额
export function useBalance(tokenAddress: `0x${string}`, address?: `0x${string}`) {
  const { data: balance, ...rest } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  const { data: decimals } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'decimals',
  });

  const formatted = balance && decimals 
    ? formatUnits(balance as bigint, Number(decimals)) 
    : '0';

  return {
    balance,
    decimals,
    formatted,
    ...rest,
  };
}

// 获取授权额度
export function useAllowance(
  tokenAddress: `0x${string}`,
  owner?: `0x${string}`,
  spender?: `0x${string}`
) {
  return useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'allowance',
    args: owner && spender ? [owner, spender] : undefined,
    query: {
      enabled: !!owner && !!spender,
    },
  });
}

// 授权
export function useApprove() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const approve = (
    tokenAddress: `0x${string}`,
    spender: `0x${string}`,
    amount?: bigint
  ) => {
    writeContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'approve',
      args: [spender, amount ?? maxUint256],
    });
  };

  return {
    approve,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

// 转账
export function useTransfer() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const transfer = (
    tokenAddress: `0x${string}`,
    to: `0x${string}`,
    amount: bigint
  ) => {
    writeContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'transfer',
      args: [to, amount],
    });
  };

  return {
    transfer,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

// 获取 Token 信息
export function useTokenInfo(tokenAddress: `0x${string}`) {
  const { data: symbol } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'symbol',
  });

  const { data: decimals } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'decimals',
  });

  const { data: name } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'name',
  });

  const { data: totalSupply } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'totalSupply',
  });

  return {
    symbol: symbol as string | undefined,
    decimals: decimals as number | undefined,
    name: name as string | undefined,
    totalSupply: totalSupply as bigint | undefined,
  };
}

// 解析金额
export function parseTokenAmount(amount: string, decimals: number): bigint {
  return parseUnits(amount, decimals);
}

// 格式化金额
export function formatTokenAmount(amount: bigint, decimals: number, precision = 2): string {
  const formatted = formatUnits(amount, decimals);
  return parseFloat(formatted).toFixed(precision);
}

