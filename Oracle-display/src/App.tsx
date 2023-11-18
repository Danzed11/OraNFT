import { useEffect, useRef, useState } from "react";
import { ethers } from "ethers";
import "./App.css";
import { CONTRACT_ABI } from "./abi";

const CONTRACT_ADDRESS = "0xff9Ddf1956DE04b73bdD0b2Ee2F1CfE4cf4CF146";
const SUBSCRIPTION_ID = 1678;
function App() {
  const {
    sendRequest,
    estimating,
    setContract,
    estimate,
    setTokenId,
    contract,
    tokenId,
  } = useTokenPricing();
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        padding: 64,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          padding: 24,
          borderRadius: 8,
          border: "1px solid white",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div>
          <input
            placeholder='contract'
            onChange={(e) => {
              setContract(e.target.value);
            }}
          />
          <input
            placeholder='tokenId'
            onChange={(e) => {
              setTokenId(e.target.value);
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>Estimate Price:</span>
          <span>{estimating ? "--" : estimate?.estimate ?? "--"} ETH</span>
        </div>
        <button
          disabled={estimating}
          onClick={() => {
            if (contract && tokenId) {
              sendRequest({
                contract,
                tokenId,
              });
            } else {
              alert("Please input valid contract and token id first");
            }
          }}
        >
          Estimate
        </button>
      </div>
    </div>
  );
}

export default App;

function useTokenPricing() {
  const [estimating, setEstimating] = useState(false);
  const [contract, setContract] = useState<string>();
  const [tokenId, setTokenId] = useState<string>();
  const [estimate, setEstimate] = useState<{
    floor: number;
    estimate: number;
  }>();

  const contractInstanceRef = useRef<ethers.Contract>();
  const signerRef = useRef<ethers.providers.JsonRpcSigner>();
  const login = async () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const provider = new ethers.providers.Web3Provider(window?.ethereum);
    await provider.send("eth_requestAccounts", []);
    return provider;
  };
  useEffect(() => {
    login().then((provider) => {
      const signer = provider.getSigner();
      signerRef.current = signer;
      const contractInstance = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer
      );
      contractInstance.on("Response", (_, value) => {
        if (!value) {
          alert("This NFT's price can not be estimated currently");
          return;
        }
        setEstimating(false);
        const res = JSON.parse(value);
        setEstimate({ floor: res.f, estimate: res.p });
      });
      contractInstanceRef.current = contractInstance;
    });
  }, []);

  const sendRequest = ({
    contract,
    tokenId,
  }: {
    contract: string;
    tokenId: string;
  }) => {
    setEstimating(true);
    contractInstanceRef.current
      ?.sendRequest(SUBSCRIPTION_ID, [tokenId, contract])
      .catch(() => {
        setEstimating(false);
      });
  };
  return {
    sendRequest,
    estimating,
    estimate,
    setContract,
    setTokenId,
    contract,
    tokenId,
  };
}
