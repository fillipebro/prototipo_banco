package com.bradesco.securebank.service;

import com.bradesco.securebank.domain.AppUser;
import com.bradesco.securebank.domain.Transfer;
import com.bradesco.securebank.repo.TransferRepo;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Formatter;
import java.util.List;

@Service
public class TransferService {
    private final TransferRepo repo;
    private final int nightStart; private final int nightEnd;
    private final BigDecimal pixNightLimit; private final BigDecimal tedNightLimit;

    public TransferService(
            TransferRepo repo,
            @Value("${risk.nightStartHour}") int nightStart,
            @Value("${risk.nightEndHour}") int nightEnd,
            @Value("${risk.pixNightLimit}") BigDecimal pixNightLimit,
            @Value("${risk.tedNightLimit}") BigDecimal tedNightLimit
    ){
        this.repo = repo;
        this.nightStart = nightStart;
        this.nightEnd = nightEnd;
        this.pixNightLimit = pixNightLimit;
        this.tedNightLimit = tedNightLimit;
    }

    public Transfer create(AppUser user, String type, BigDecimal amount, String toCpf){
        Transfer t = new Transfer();
        t.setUser(user);
        t.setType(type.toLowerCase());
        t.setAmount(amount);
        t.setToCpf(toCpf != null ? toCpf : "");
        t.setCreatedAt(LocalDateTime.now());

        String reason = riskCheck(t);
        t.setStatus(reason.isEmpty() ? "APPROVED" : "BLOCKED");
        t.setRiskReason(reason.isEmpty() ? "OK" : reason);
        t.setVerificationCode(checksum(user.getEmail() + "|" + t.getCreatedAt().toString() + "|" + t.getAmount()));

        return repo.save(t);
    }

    private String riskCheck(Transfer t){
        int hour = LocalTime.now().getHour();
        boolean isNight = (hour >= nightStart) || (hour < nightEnd);
        if (isNight){
            if ("pix".equals(t.getType()) && t.getAmount().compareTo(pixNightLimit) > 0){
                return "PIX acima do limite noturno de R$ " + pixNightLimit;
            }
            if ("ted".equals(t.getType()) && t.getAmount().compareTo(tedNightLimit) > 0){
                return "TED acima do limite noturno de R$ " + tedNightLimit;
            }
        }
        if (t.getToCpf() != null && !t.getToCpf().isBlank()){
            if (t.getToCpf().equals("00000000000")){
                return "CPF do destinatário suspeito (placeholder)";
            }
        }
        return "";
    }

    public List<Transfer> list(AppUser user){
        return repo.findByUserOrderByCreatedAtDesc(user);
    }

    private String checksum(String input){
        try{
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(input.getBytes());
            Formatter f = new Formatter();
            for (int i=0;i<6;i++){ f.format("%02x", hash[i]); }
            String out = f.toString();
            f.close();
            return out.toUpperCase();
        }catch(Exception e){ return "000000"; }
    }
}
