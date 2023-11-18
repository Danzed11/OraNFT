import { useEffect, useRef, useState } from "react";
import { ethers } from "ethers";
import "./App.css";
import { CONTRACT_ABI } from "./abi";

const CONTRACT_ADDRESS = "0x15076ec9faa835ae578d81997c8c44e0ed0d2940";
const SUBSCRIPTION_ID = 1694;
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
          <h3>Input</h3>
          <span>Contract Address:</span>
          <input
            placeholder='contract'
            onChange={(e) => {
              setContract(e.target.value);
            }}
          />
        </div>
        <div>
          <span>Token Id:</span>
          <input
            placeholder='tokenId'
            onChange={(e) => {
              setTokenId(e.target.value);
            }}
          />
        </div>
        <div>
          <span>Estimated Price: {estimating ? "--" : estimate?.estimate ?? "--"} ETH </span>
        </div>
        <div>
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
        <div>
          <h3>Price Calculation Method</h3>
          <ul>
            <li>Estimated Price = Floor Price * (1 + Intercept + sum(Trait Weight))</li>
            In detail:
            <ul>
              <li>Estimated Price = Base Value + sum(Trait Premium) </li>
              <li>Base Value = Floor Price * (1 + Intercept) </li>
              <li>Trait Premium = Floor Price * Trait Weights </li>
            </ul>
          </ul>
        </div>
        <div>
          <h3>Verification</h3>
          <ul>
            <li>Floor price: {estimating ? "--" : estimate?.floor ?? "--"} </li>
            {/* <li>Weights: {estimating ? "--" : estimate?.weights ?? "--"} </li> */}
          </ul>
          calulate the estimated price from floor price and weights, if the result is the same as the estimated price, then the calculation is correct.
          {/* <br />
          <button onClick={() => {
            if (estimate) {
              const { floor, weights } = estimate;
              const [intercept, ...traitWeights] = weights.split(",").map((w) => Number(w));
              const baseValue = floor * (1 + intercept);
              const traitPremium = traitWeights.map((w) => floor * w);
              const estimatedPrice = baseValue + traitPremium.reduce((a, b) => a + b, 0);
              alert(`Estimated Price: ${estimatedPrice} ETH`);
            }
          }}>
            Verify
          </button> */}
        </div>
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
    weights: Map<string, number>;
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
        const weights = new Map<string, number>();
        res.w.forEach((w: number, i: number) => {
          weights.set(res.t[i], w);
        });
        setEstimate({ floor: res.f, estimate: res.p , weights: res.w});
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
