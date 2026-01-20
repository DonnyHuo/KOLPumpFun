'use client';

import { useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { formatUnits } from 'viem';
import { useEffect, useState, useRef, startTransition } from 'react';
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
export function useCanWithdrawValue(tokenId?: bigint, address?: `0x${string}`) {
  const publicClient = usePublicClient();
  const [data, setData] = useState<bigint | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const prevParamsRef = useRef<{ tokenId?: bigint; address?: `0x${string}` }>({});

  useEffect(() => {
    // 检查参数是否变化
    const paramsChanged = 
      prevParamsRef.current.tokenId !== tokenId || 
      prevParamsRef.current.address !== address;

    if (!paramsChanged && !publicClient) {
      return;
    }

    // 更新引用
    prevParamsRef.current = { tokenId, address };

    if (!tokenId || !address || !publicClient) {
      // 只在参数变化时才更新状态
      if (paramsChanged) {
        startTransition(() => {
          setData(undefined);
          setIsLoading(false);
        });
      }
      return;
    }

    // 使用 startTransition 包装所有 setState 调用
    startTransition(() => {
      setIsLoading(true);
      setError(null);
    });

    publicClient
      .readContract({
        address: KOL_ADDRESS,
        abi: kolAbi,
        functionName: 'viewCanWithdrawValue',
        args: [tokenId],
        account: address, // 指定调用账户地址，这样合约内部的 msg.sender 就是 address
      })
      .then((result) => {
        startTransition(() => {
          setData(result as bigint);
          setIsLoading(false);
        });
      })
      .catch((err) => {
        console.error('useCanWithdrawValue error:', err);
        startTransition(() => {
          setError(err as Error);
          setIsLoading(false);
          setData(undefined);
        });
      });
  }, [tokenId, address, publicClient]);

  const formatted = data ? formatUnits(data, 18) : '0';

  // 提供 refetch 函数
  const refetch = () => {
    if (!tokenId || !address || !publicClient) return;
    setIsLoading(true);
    setError(null);
    publicClient
      .readContract({
        address: KOL_ADDRESS,
        abi: kolAbi,
        functionName: 'viewCanWithdrawValue',
        args: [tokenId],
        account: address,
      })
      .then((result) => {
        setData(result as bigint);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('useCanWithdrawValue refetch error:', err);
        setError(err as Error);
        setIsLoading(false);
        setData(undefined);
      });
  };

  return {
    value: data,
    formatted,
    isLoading,
    error,
    refetch,
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

