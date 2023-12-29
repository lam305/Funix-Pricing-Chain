const { expect } = require("chai");
const hre = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");


describe("Main", function () {
   
    async function deployMain() {
        const Main = await ethers.getContractFactory("Main");
        const main = await Main.deploy();
        const signers = await ethers.getSigners();
        const [admin, account1, account2, account3] = signers;
      
        return { main, admin, account1, account2, account3 };
      }
  
   describe("Create new session", function () {
        it("should allow admin to create a new session", async function () {
            const { main, admin} = await loadFixture(deployMain);
            await main.createNewSession("Product 1", "Description 1", ["image hash", "image hash"], 1000);
            const sessionsInfo = await main.getSessionsInfo();

            expect(sessionsInfo.length).to.equal(1);
        });

        it("should not allow non-admin to create a new session", async function () {
            const { main, account1} = await loadFixture(deployMain);
            await expect(main.connect(account1).createNewSession(
                "Product 2", 
                "Description 2",
                ["image hash", "image hash"],
                2000)).to.be.revertedWith("only admin can do this");
        });
        it("should retrieve all sessions information correctly", async function () {
            const { main, admin } = await loadFixture(deployMain);
    
            // Create sessions
            await main.connect(admin).createNewSession("Product 1", "Description 1", ["image hash 1"], 1000);
            await main.connect(admin).createNewSession("Product 2", "Description 2", ["image hash 2"], 2000);
    
            const sessionsInfo = await main.getSessionsInfo();
    
            // Verify sessions information
            expect(sessionsInfo.length).to.equal(2);
    
            expect(sessionsInfo[0].productName).to.equal("Product 1");
            expect(sessionsInfo[0].productDescription).to.equal("Description 1");
            /* when comparing arrays using the === operator, it checks for reference equality,
             meaning it checks if the two arrays refer to the same memory location. . */
            expect(sessionsInfo[0].productImages).to.deep.equal(["image hash 1"]);
            
    
            expect(sessionsInfo[1].productName).to.equal("Product 2");
            expect(sessionsInfo[1].productDescription).to.equal("Description 2");
            expect(sessionsInfo[1].productImages).to.deep.equal(["image hash 2"]);
        });
   })

   describe("register", function () {
        it("should allow member to register", async function () {
            const { main, account1} = await loadFixture(deployMain);
            const registrationResult = await main.connect(account1).register("lam", "lam@gmail.com");

            // Wait for the transaction to be mined and get the transaction receipt
            const receipt = await registrationResult.wait();
            //console.log(receipt, receipt.status);

            // Check the transaction status
            expect(receipt.status).to.equal(1)

            // Assert that the participant's information is as expected
            const participant = await main.connect(account1).getParticipant();
            //console.log("Participant:", participant);
    
            expect(participant.name).to.equal("lam");
            expect(participant.email).to.equal("lam@gmail.com");
        });

        it("should not allow a member to register more than once", async function () {
            const { main, account1 } = await loadFixture(deployMain);
          
            // register member first time
            await main.connect(account1).register("lam", "lam@gmail.com");
          
            // register the member again
            await expect(main.connect(account1).register("lam", "lam@gmail.com")).to.be.revertedWith("already registered");
        });

        it("should have a limit on the number of registered members", async function () {
            const { main } = await loadFixture(deployMain);
            const signers = await ethers.getSigners();
            const [admin, account1, account2, account3, 
            account4, account5, account6, account7,
            account8, account9, account10, account11] = signers;
          
            // Register multiple members up to the limit
            await main.connect(account1).register("Member 1", "member1@gmail.com");
            await main.connect(account2).register("Member 2", "member2@gmail.com");
            await main.connect(account3).register("Member 3", "member3@gmail.com");
            await main.connect(account4).register("Member 4", "member4@gmail.com");
            await main.connect(account5).register("Member 5", "member5@gmail.com");
            await main.connect(account6).register("Member 6", "member6@gmail.com");
            await main.connect(account7).register("Member 7", "member7@gmail.com");
            await main.connect(account8).register("Member 8", "member8@gmail.com");
            await main.connect(account9).register("Member 9", "member9@gmail.com");
            await main.connect(account10).register("Member 10", "member10@gmail.com");
                 
            // Attempt to register another member
            await expect(main.connect(account11).register("Member 11", "member11@gmail.com")).to.be.revertedWith("Maximum 10 participants");
        });
    })

    describe("approvedPaticipant", function () {
        it("admin can approve a registered member", async function () {
            const { main, admin , account1} = await loadFixture(deployMain);

            await main.connect(account1).register("Member 1", "member1@gmail.com");

            await main.connect(admin).approvedPaticipant(account1.address);
            const participant = await main.connect(account1).getParticipant();

            expect(participant.approved).to.be.true;
        });
        it("unregistered member cannot be approved.", async function () {
            const { main, admin , account1} = await loadFixture(deployMain);

            await expect(main.connect(admin).approvedPaticipant(account1.address)).to.be.revertedWith("participant is not registered");
        }); 
   })

   describe("Testing Session Price Proposals", function () {
        it("should allow registered and approved member to suggest prices", async function () {
            const { main, admin , account1} = await loadFixture(deployMain);

            await main.connect(account1).register("Member 1", "member1@gmail.com");

            await main.connect(admin).approvedPaticipant(account1.address);
            // Create a new session
            await main.createNewSession("Product 1", "...", ["image hash1", "image hash2"], 1000);
            // Retrieve the session contract address
            const sessionsInfo = await main.getSessionsInfo();
            const sessionAddress = sessionsInfo[0].sessionAddress;

            // Get the session contract instance
            const Session = await ethers.getContractFactory("Session");
            sessionContract = await Session.attach(sessionAddress);

            await sessionContract.connect(account1).proposeProductPrice(1000);
            const price = await sessionContract.getParticipantProposePrice(account1.address);
            expect(price).to.equal(1000);
            
        });
        it("members can only suggest prices during the session.", async function () {
            const { main, admin , account1} = await loadFixture(deployMain);

            await main.connect(account1).register("Member 1", "member1@gmail.com");

            await main.connect(admin).approvedPaticipant(account1.address);
            // Create a new session
            await main.createNewSession("Product 1", "...", ["image hash1", "image hash2"], 1000);
            // Retrieve the session contract address
            const sessionsInfo = await main.getSessionsInfo();
            const sessionAddress = sessionsInfo[0].sessionAddress;

            // Get the session contract instance
            const Session = await ethers.getContractFactory("Session");
            sessionContract = await Session.attach(sessionAddress);

             // Move time forward to be during the session
            await ethers.provider.send("evm_increaseTime", [2000]); // Move time forward by 2000s 
            await ethers.provider.send("evm_mine"); // Mine a new block to apply the time change

            await expect(sessionContract.connect(account1).proposeProductPrice(1000)).to.revertedWith("Session is ended");
            
        });

    })

    describe("End Session", function () {
        it("the admin can end the session", async function () {
            const { main, admin , account1} = await loadFixture(deployMain);

            await main.connect(account1).register("Member 1", "member1@gmail.com");

            await main.connect(admin).approvedPaticipant(account1.address);
            // Create a new session
            await main.createNewSession("Product 1", "...", ["image hash1", "image hash2"], 1000);
            // Retrieve the session contract address
            const sessionsInfo = await main.getSessionsInfo();
            const sessionAddress = sessionsInfo[0].sessionAddress;

            // Get the session contract instance
            const Session = await ethers.getContractFactory("Session");
            sessionContract = await Session.attach(sessionAddress);
            await sessionContract.connect(account1).proposeProductPrice(1000);
            await sessionContract.connect(admin).endSession(1234);
            
            // Get realPrice and state
            const realPrice = await sessionContract.realPrice();
            const state = await sessionContract.state();

            expect(realPrice).to.equal(1234);
            expect(state).to.equal(1);
            
        });

        it("proposed price are calculated properly with 2 member deviation = 0", async function () {
            const { main, admin , account1, account2} = await loadFixture(deployMain);
            // register 3 acc
            await main.connect(account1).register("Member 1", "member1@gmail.com");
            await main.connect(account2).register("Member 2", "member2@gmail.com");
            //approve acc1, acc2
            await main.connect(admin).approvedPaticipant(account1.address);
            await main.connect(admin).approvedPaticipant(account2.address);
            // Create a new session
            await main.createNewSession("Product 1", "...", ["image hash1", "image hash2"], 1000);
            // Retrieve the session contract address
            const sessionsInfo = await main.getSessionsInfo();
            const sessionAddress = sessionsInfo[0].sessionAddress;

            // Get the session contract instance
            const Session = await ethers.getContractFactory("Session");
            sessionContract = await Session.attach(sessionAddress);
            //Propose with acc1, acc2
            await sessionContract.connect(account1).proposeProductPrice(100);
            await sessionContract.connect(account2).proposeProductPrice(120);
            await sessionContract.connect(admin).endSession(150);
            //get suggestPrice
            const suggestedPrice = await sessionContract.suggestedPrice();

            expect(suggestedPrice).to.equal(110);
            
        });

        it("member deviations are calculated correctly based on suggested and actual prices", async function () {
            const { main, admin , account1, account2} = await loadFixture(deployMain);
            // register 3 acc
            await main.connect(account1).register("Member 1", "member1@gmail.com");
            await main.connect(account2).register("Member 2", "member2@gmail.com");
            //approve acc1, acc2
            await main.connect(admin).approvedPaticipant(account1.address);
            await main.connect(admin).approvedPaticipant(account2.address);
            // Create a new session
            await main.createNewSession("Product 1", "...", ["image hash1", "image hash2"], 1000);
            // Retrieve the session contract address
            let sessionsInfo = await main.getSessionsInfo();
            const sessionAddress = sessionsInfo[0].sessionAddress;

            // Get the session contract instance
            const Session = await ethers.getContractFactory("Session");
            sessionContract = await Session.attach(sessionAddress);
            //Propose with acc1, acc2
            await sessionContract.connect(account1).proposeProductPrice(70);
            await sessionContract.connect(account2).proposeProductPrice(80);
            await sessionContract.connect(admin).endSession(100);
            //get deviations
            let acc1 = await main.connect(account1).getParticipant();
            let acc2 = await main.connect(account2).getParticipant();
            const deviation1 = await acc1.deviation;
            const deviation2 = await acc2.deviation;

            expect(deviation1).to.equal(30);
            expect(deviation2).to.equal(20);

            // Create second session
            await main.createNewSession("Product 2", "...", ["image hash1", "image hash2"], 1000);
            // Retrieve the session contract address
            sessionsInfo = await main.getSessionsInfo();
            const sessionAddress2 = sessionsInfo[1].sessionAddress;

            // Get the session 2 contract instance
            sessionContract2 = await Session.attach(sessionAddress2);
            //Propose with acc1, acc2
            await sessionContract2.connect(account1).proposeProductPrice(50);
            await sessionContract2.connect(account2).proposeProductPrice(60);
            await sessionContract2.connect(admin).endSession(100);

            acc1 = await main.connect(account1).getParticipant();
            acc2 = await main.connect(account2).getParticipant();

            const deviation1new = await acc1.deviation;
            console.log(deviation1new);
            const deviation2new = await acc2.deviation;

            expect(deviation1new).to.equal(40);
            expect(deviation2new).to.equal(30);
            
        });

        it("proposed price are calculated properly with 3 member deviation != 0", async function () {
            const { main, admin , account1, account2, account3} = await loadFixture(deployMain);
            //register 3 acc
            await main.connect(account1).register("Member 1", "member1@gmail.com");
            await main.connect(account2).register("Member 2", "member2@gmail.com");
            await main.connect(account3).register("Member 3", "member4@gmail.com");
            //approve acc1, acc2, acc3
            await main.connect(admin).approvedPaticipant(account1.address);
            await main.connect(admin).approvedPaticipant(account2.address);
            await main.connect(admin).approvedPaticipant(account3.address);
            // Create a new session
            await main.createNewSession("Product 1", "...", ["image hash1", "image hash2"], 1000);
            // Retrieve the session contract address
            let sessionsInfo = await main.getSessionsInfo();
            const sessionAddress = sessionsInfo[0].sessionAddress;

            // Get the session contract instance
            const Session = await ethers.getContractFactory("Session");
            sessionContract = await Session.attach(sessionAddress);
            //Propose with acc1, acc2, acc3
            await sessionContract.connect(account1).proposeProductPrice(70);
            await sessionContract.connect(account2).proposeProductPrice(80);
            await sessionContract.connect(account3).proposeProductPrice(90);
            await sessionContract.connect(admin).endSession(100);


            // Create second session
            await main.createNewSession("Product 2", "...", ["image hash1", "image hash2"], 1000);
            // Retrieve the session contract address
            sessionsInfo = await main.getSessionsInfo();
            const sessionAddress2 = sessionsInfo[1].sessionAddress;

            // Get the session 2 contract instance
            sessionContract2 = await Session.attach(sessionAddress2);
            //Propose with acc1, acc2, acc3 
            await sessionContract2.connect(account1).proposeProductPrice(50);
            await sessionContract2.connect(account2).proposeProductPrice(40);
            await sessionContract2.connect(account3).proposeProductPrice(70);
            await sessionContract2.connect(admin).endSession(100);
            
            const suggestedPriceProduct2 = await sessionContract2.suggestedPrice();
            expect(suggestedPriceProduct2).to.equal(54);
        });


    })
    describe("Test Updating Member Information", function () {
        it("registered members can update their information", async function () {
            const { main, account1 } = await loadFixture(deployMain);
          
            // register member first time
            await main.connect(account1).register("lam", "lam@gmail.com");
            await main.connect(account1).changeParticipantInfo("lam2", "lam2@gmail.com");
            const participant = await main.connect(account1).getParticipant();
    
            expect(participant.name).to.equal("lam2");
            expect(participant.email).to.equal("lam2@gmail.com");
        });
        it("should not allow non-registered members to update their information", async function () {
            const { main, account1 } = await loadFixture(deployMain);
    
            await expect(main.connect(account1).changeParticipantInfo("lam2", "lam2@gmail.com")).to.revertedWith("not a registered");
        });

       
   })


  




});