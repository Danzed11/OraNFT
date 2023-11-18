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
        padding: 10,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          padding: 0,
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
            <li><strong>Estimated Price </strong>= Floor Price * (1 + Intercept + sum(Trait Weight))</li>
            In detail:
            <ul>
              <li>Estimated Price = Base Value + sum(Trait Premium) </li>
              <li>Base Value = Floor Price * (1 + Intercept) </li>
              <li>Trait Premium = Floor Price * Trait Weight </li>
            </ul>
            <li><strong>Trait Premium:</strong> Premium value for every trait. Every Trait has the same premium value at the same time. </li>
            <li><strong>Trait Weights:</strong> Trait premium ratio to floor price </li>
            <li><strong>Base Value:</strong> Value for a collection (linear to floor price). Floor price can not represent collection base value well
                 because it doesn't include buyside impacts. Thus, a collection base value is slightly smaller than floor price. </li>
            <li><strong>Intercept:</strong> Intercept for a collection (linear to floor price). A collection intercept is slightly smaller than 0. </li>
          </ul>
        </div>
        <div>
          <h3>Verification</h3>
          <ul>
            <li>Floor price: {estimating ? "--" : estimate?.floor ?? "--"} </li>
            <li>Intercept: {estimating ? "--" : estimate?.intercept ?? "--"} </li>
            <li>Trait Weights:</li>
            <ul>
              {estimating
                ? "--"
                : Object.entries(estimate?.weights ?? {}).map(([key, value]) => (
                    <li key={key}>
                      Trait {key}: {value}
                    </li>  
                  )) }
            </ul>
          </ul>
          calulate the estimated price from floor price and weights, if the result is the same as the estimated price, then the calculation is correct.
          <br />
          <button onClick={() => {
            if (estimate) {
              const { floor, intercept, weights } = estimate;
              const baseValue = floor * (1 + intercept);
              const traitPremium = Object.entries(weights).reduce((acc, [key, value]) => {
                return acc + floor * value;
              }, 0);
              const expected = baseValue + traitPremium;
              alert(`Estimated Price: ${expected} ETH`);
            } else {
              alert("Please estimate first");
            }
          }}>Verify</button>
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
    intercept: number;
    weights: { [key: string]: number };
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
        // const weights = new Map<string, number>();
        // res.w.forEach((x: string, i: number) => {
        //   weights.set(x, i);
        // });
        setEstimate({ floor: res.f, estimate: res.p , intercept: res.i, weights: res.w});
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
