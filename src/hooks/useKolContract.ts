'use client';

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits } from 'viem';
import { CONTRACTS } from '@/constants/contracts';
import kolAbi from '@/constants/abi/kol.json';

const KOL_ADDRESS = CONTRACTS.KOL as `0x${string}`;

// 获取项目 Token ID
export function useTokenRatiosIndex(projectName: string) {
  return useReadContract({
    address: KOL_ADDRESS,
    abi: kolAbi,
    functionName: 'getTokenRatiosIndexByProjectName',
    args: [projectName],
    query: {
      enabled: !!projectName,
    },
  });
}

// 获取可提取金额
export function useCanWithdrawValue(tokenId?: bigint) {
  const { data, ...rest } = useReadContract({
    address: KOL_ADDRESS,
    abi: kolAbi,
    functionName: 'viewCanWithdrawValue',
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: {
      enabled: tokenId !== undefined,
    },
  });

  const formatted = data ? formatUnits(data as bigint, 18) : '0';

  return {
    value: data as bigint | undefined,
    formatted,
    ...rest,
  };
}

// 获取跨链进度
export function useCrossProgress(tokenId?: bigint) {
  const { data, ...rest } = useReadContract({
    address: KOL_ADDRESS,
    abi: kolAbi,
    functionName: 'getCrossProgress',
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: {
      enabled: tokenId !== undefined,
    },
  });

  const percentage = data ? (Number(data) / 100).toFixed(2) : '0';

  return {
    progress: data as bigint | undefined,
    percentage,
    ...rest,
  };
}

// 获取 LP 进度
export function useLpExProgress(tokenId?: bigint) {
  const { data, ...rest } = useReadContract({
    address: KOL_ADDRESS,
    abi: kolAbi,
    functionName: 'getLpExProgress',
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: {
      enabled: tokenId !== undefined,
    },
  });

  const percentage = data ? (Number(data) / 100).toFixed(2) : '0';

  return {
    progress: data as bigint | undefined,
    percentage,
    ...rest,
  };
}

// 获取 KOL 进度
export function useKolProgress(tokenId?: bigint) {
  const { data, ...rest } = useReadContract({
    address: KOL_ADDRESS,
    abi: kolAbi,
    functionName: 'getKolProgress',
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: {
      enabled: tokenId !== undefined,
    },
  });

  const percentage = data ? (Number(data) / 100).toFixed(2) : '0';

  return {
    progress: data as bigint | undefined,
    percentage,
    ...rest,
  };
}

// 获取 Token 空投 KOL 数量
export function useTokenAirdropKols(tokenId?: bigint) {
  const { data, ...rest } = useReadContract({
    address: KOL_ADDRESS,
    abi: kolAbi,
    functionName: 'tokenAirdropKols',
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: {
      enabled: tokenId !== undefined,
    },
  });

  const percentage = data ? (Number(data) / 100).toFixed(2) : '0';

  return {
    value: data as bigint | undefined,
    percentage,
    ...rest,
  };
}

// 提取 KOL 空投
export function useWithdrawKolAirdrop() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const withdraw = (tokenId: bigint) => {
    writeContract({
      address: KOL_ADDRESS,
      abi: kolAbi,
      functionName: 'withdrawKolAirdrop',
      args: [tokenId],
    });
  };

  return {
    withdraw,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

// 退出 KOL
export function useQuitKol() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const quitKol = (tokenId: number | bigint) => {
    writeContract({
      address: KOL_ADDRESS,
      abi: kolAbi,
      functionName: 'quitKol',
      args: [BigInt(tokenId)],
    });
  };

  return {
    quitKol,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

